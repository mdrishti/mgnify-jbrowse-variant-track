/**
 * MVIKGQueryBuilder — template-driven SPARQL query builder for MVIKG.
 *
 * Left panel: template picker + organism/gene inputs with QLever typeahead.
 * Right panel: assembled SPARQL (editable textarea) + Run button.
 * Bottom: results table with clickable URIs.
 *
 * Route: /query
 * Endpoint read from VITE_QLEVER_ENDPOINT (default http://localhost:7035).
 */

import "@fontsource/roboto";
import React, { useCallback, useEffect, useRef, useState } from "react";

const QLEVER_ENDPOINT =
  (import.meta.env.VITE_QLEVER_ENDPOINT as string) || "http://localhost:7035";

// ---------------------------------------------------------------------------
// SPARQL templates
// ---------------------------------------------------------------------------

const PREFIXES = `PREFIX biolink: <https://biolink.github.io/biolink-model/biolink/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX MVIKG: <https://mvikg.ebi.ac.uk/>
PREFIX MVIKGBOX: <https://mvikg.ebi.ac.uk/box/>
`;

interface Template {
  id: string;
  label: string;
  description: string;
  inputs: ("organism" | "gene")[];
  build: (organism: string, taxonUri: string, gene: string) => string;
}

const TEMPLATES: Template[] = [
  {
    id: "variants_by_organism_gene",
    label: "Variants by organism + gene",
    description: "All variants involving a specific gene in a specific organism.",
    inputs: ["organism", "gene"],
    build: (_org, taxonUri, gene) => `${PREFIXES}
SELECT ?paper ?geneLabel ?variantLabel ?source WHERE {
  ?sample biolink:in_taxon ${taxonUri ? `<${taxonUri}>` : "?taxon"} .
  ?ann biolink:in_taxon ?taxon ;
       rdf:type biolink:Gene ;
       rdfs:label ?geneLabel .
  FILTER(CONTAINS(LCASE(STR(?geneLabel)), LCASE("${gene}")))
  ?rel biolink:subject ?ann ;
       biolink:object ?variantAnn .
  ?variantAnn rdf:type biolink:SequenceVariant ;
              rdfs:label ?variantLabel .
  ?doc dcterms:hasPart ?section .
  ?section dcterms:hasPart ?ann .
  ?doc rdfs:label ?paper .
  OPTIONAL { ?doc dcterms:source ?source . }
}
ORDER BY ?paper ?geneLabel`,
  },
  {
    id: "variants_by_organism",
    label: "All variants for an organism",
    description: "Every variant mentioned in papers about this organism.",
    inputs: ["organism"],
    build: (_org, taxonUri, _gene) => `${PREFIXES}
SELECT ?paper ?variantLabel ?geneLabel ?source WHERE {
  ?sample biolink:in_taxon ${taxonUri ? `<${taxonUri}>` : "?taxon"} .
  ?variantAnn rdf:type biolink:SequenceVariant ;
              rdfs:label ?variantLabel .
  OPTIONAL {
    ?rel biolink:object ?variantAnn ;
         biolink:subject ?geneAnn .
    ?geneAnn rdf:type biolink:Gene ;
             rdfs:label ?geneLabel .
  }
  ?section dcterms:hasPart ?variantAnn .
  ?doc dcterms:hasPart ?section ;
       rdfs:label ?paper .
  OPTIONAL { ?doc dcterms:source ?source . }
}
ORDER BY ?paper ?variantLabel`,
  },
  {
    id: "papers_by_gene",
    label: "Papers mentioning a gene",
    description: "All papers that annotate a specific gene.",
    inputs: ["gene"],
    build: (_org, _taxonUri, gene) => `${PREFIXES}
SELECT DISTINCT ?paper ?taxonLabel ?source WHERE {
  ?ann rdf:type biolink:Gene ;
       rdfs:label ?geneLabel .
  FILTER(CONTAINS(LCASE(STR(?geneLabel)), LCASE("${gene}")))
  ?section dcterms:hasPart ?ann .
  ?doc dcterms:hasPart ?section ;
       rdfs:label ?paper .
  OPTIONAL { ?doc dcterms:source ?source . }
  OPTIONAL {
    ?ann biolink:in_taxon ?taxon .
    ?taxon rdfs:label ?taxonLabel .
  }
}
ORDER BY ?paper`,
  },
  {
    id: "all_organisms",
    label: "All organisms in the KG",
    description: "Every organism (taxon) present in the knowledge graph.",
    inputs: [],
    build: () => `${PREFIXES}
SELECT ?taxon ?taxonLabel (COUNT(DISTINCT ?sample) AS ?sampleCount) WHERE {
  ?sample biolink:in_taxon ?taxon .
  OPTIONAL { ?taxon rdfs:label ?taxonLabel . }
}
GROUP BY ?taxon ?taxonLabel
ORDER BY DESC(?sampleCount)`,
  },
  {
    id: "genes_cooccurring",
    label: "Genes co-occurring with organism in a paper",
    description: "All genes annotated alongside this organism in the same paper.",
    inputs: ["organism"],
    build: (_org, taxonUri, _gene) => `${PREFIXES}
SELECT ?geneLabel (COUNT(DISTINCT ?doc) AS ?paperCount) WHERE {
  ?sample biolink:in_taxon ${taxonUri ? `<${taxonUri}>` : "?taxon"} .
  ?geneAnn rdf:type biolink:Gene ;
           rdfs:label ?geneLabel .
  ?section dcterms:hasPart ?geneAnn .
  ?doc dcterms:hasPart ?section .
}
GROUP BY ?geneLabel
ORDER BY DESC(?paperCount)`,
  },
];

// ---------------------------------------------------------------------------
// QLever helpers
// ---------------------------------------------------------------------------

async function runSparql(query: string): Promise<{ vars: string[]; rows: Record<string, { type: string; value: string }>[] }> {
  const params = new URLSearchParams({ query, action: "sparql_json" });
  const resp = await fetch(`${QLEVER_ENDPOINT}/sparql?${params}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!resp.ok) throw new Error(`QLever returned ${resp.status}`);
  const data = await resp.json();
  const vars: string[] = data.head?.vars ?? [];
  const rows = (data.results?.bindings ?? []) as Record<string, { type: string; value: string }>[];
  return { vars, rows };
}

async function fetchTaxonSuggestions(text: string): Promise<{ label: string; uri: string }[]> {
  if (text.length < 2) return [];
  const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX biolink: <https://biolink.github.io/biolink-model/biolink/>
SELECT DISTINCT ?taxon ?label WHERE {
  ?sample biolink:in_taxon ?taxon .
  OPTIONAL { ?taxon rdfs:label ?label . }
  FILTER(CONTAINS(LCASE(COALESCE(STR(?label), STR(?taxon))), LCASE("${text.replace(/"/g, '')}")))
}
LIMIT 10`;
  try {
    const { rows } = await runSparql(query);
    return rows.map((r) => ({
      uri: r.taxon?.value ?? "",
      label: r.label?.value ?? r.taxon?.value ?? "",
    })).filter((r) => r.uri);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Typeahead input
// ---------------------------------------------------------------------------

interface TypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelectUri: (uri: string) => void;
  fetchSuggestions: (text: string) => Promise<{ label: string; uri: string }[]>;
  placeholder?: string;
  disabled?: boolean;
}

function TypeaheadInput({ value, onChange, onSelectUri, fetchSuggestions, placeholder, disabled }: TypeaheadProps) {
  const [suggestions, setSuggestions] = useState<{ label: string; uri: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    onSelectUri(""); // clear selected URI when typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(v);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 300);
  };

  const handleSelect = (s: { label: string; uri: string }) => {
    onChange(s.label);
    onSelectUri(s.uri);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
      />
      {open && (
        <ul style={dropdownStyle}>
          {suggestions.map((s) => (
            <li
              key={s.uri}
              onMouseDown={() => handleSelect(s)}
              style={dropdownItemStyle}
            >
              <span style={{ fontWeight: 500 }}>{s.label}</span>
              <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 8 }}>
                {s.uri.split("/").pop()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results table
// ---------------------------------------------------------------------------

function ResultsTable({ vars, rows }: { vars: string[]; rows: Record<string, { type: string; value: string }>[] }) {
  if (rows.length === 0) return <p style={{ color: "#6b7280" }}>No results.</p>;

  return (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <p style={{ color: "#6b7280", marginBottom: 8 }}>{rows.length} row(s)</p>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            {vars.map((v) => (
              <th key={v} style={thStyle}>{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              {vars.map((v) => {
                const cell = row[v];
                const val = cell?.value ?? "";
                const isUri = cell?.type === "uri";
                return (
                  <td key={v} style={tdStyle}>
                    {isUri ? (
                      <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                        {val.split("/").pop() || val}
                      </a>
                    ) : val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MVIKGQueryBuilder() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [organism, setOrganism] = useState("");
  const [taxonUri, setTaxonUri] = useState("");
  const [gene, setGene] = useState("");
  const [sparql, setSparql] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ vars: string[]; rows: Record<string, { type: string; value: string }>[] } | null>(null);

  const template = TEMPLATES.find((t) => t.id === templateId)!;

  const buildQuery = useCallback(() => {
    const q = template.build(organism, taxonUri, gene);
    setSparql(q);
    setResults(null);
    setError(null);
  }, [template, organism, taxonUri, gene]);

  // Rebuild when template changes
  useEffect(() => {
    setSparql(template.build(organism, taxonUri, gene));
    setResults(null);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const r = await runSparql(sparql);
      setResults(r);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setRunning(false);
    }
  };

  const needsOrganism = template.inputs.includes("organism");
  const needsGene = template.inputs.includes("gene");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 1400 }}>
      <h2 style={{ marginTop: 0 }}>MVIKG Query Builder</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* ── Left panel ── */}
        <div style={leftPanelStyle}>
          <label style={labelStyle}>Query template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "6px 0 16px" }}>
            {template.description}
          </p>

          {needsOrganism && (
            <>
              <label style={labelStyle}>Organism</label>
              <TypeaheadInput
                value={organism}
                onChange={setOrganism}
                onSelectUri={setTaxonUri}
                fetchSuggestions={fetchTaxonSuggestions}
                placeholder="e.g. Bacteroides thetaiotaomicron"
              />
              {taxonUri && (
                <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>
                  {taxonUri.split("/").pop()}
                </p>
              )}
            </>
          )}

          {needsGene && (
            <>
              <label style={{ ...labelStyle, marginTop: needsOrganism ? 16 : 0 }}>
                Gene / region
              </label>
              <input
                type="text"
                value={gene}
                onChange={(e) => setGene(e.target.value)}
                placeholder="e.g. clsA"
                style={inputStyle}
              />
            </>
          )}

          <button onClick={buildQuery} style={buildBtnStyle}>
            Build query
          </button>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={labelStyle}>
            SPARQL&nbsp;
            <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 12 }}>
              (editable before running)
            </span>
          </label>
          <textarea
            value={sparql}
            onChange={(e) => setSparql(e.target.value)}
            rows={22}
            spellCheck={false}
            style={textareaStyle}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleRun}
              disabled={running || !sparql.trim()}
              style={runBtnStyle(running || !sparql.trim())}
            >
              {running ? "Running…" : "▶  Run query"}
            </button>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Endpoint: {QLEVER_ENDPOINT}
            </span>
          </div>
          {error && (
            <pre style={{ color: "#991b1b", background: "#fef2f2", padding: 12, borderRadius: 6, fontSize: 12, overflow: "auto" }}>
              {error}
            </pre>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {results && <ResultsTable vars={results.vars} rows={results.rows} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const leftPanelStyle: React.CSSProperties = {
  width: 280,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  marginBottom: 6,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  padding: 12,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  resize: "vertical",
  outline: "none",
  lineHeight: 1.5,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  zIndex: 100,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const dropdownItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  borderBottom: "1px solid #f3f4f6",
};

const buildBtnStyle: React.CSSProperties = {
  marginTop: 20,
  padding: "9px 16px",
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const runBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "9px 20px",
  background: disabled ? "#9ca3af" : "#059669",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
  fontSize: 14,
});

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  background: "#f3f4f6",
  borderBottom: "2px solid #e5e7eb",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
  maxWidth: 300,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
