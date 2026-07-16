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
import MVIKGQueryGraph from "./MVIKGQueryGraph";

const QLEVER_ENDPOINT =
  (import.meta.env.VITE_QLEVER_ENDPOINT as string) || "http://localhost:7035";

// ---------------------------------------------------------------------------
// SPARQL templates
// ---------------------------------------------------------------------------

const PREFIXES = `PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX dcmitype: <http://purl.org/dc/dcmitype/>
PREFIX sosa:    <http://www.w3.org/ns/sosa/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX mvikg:    <https://w3id.org/mvikg#>
`;

interface Template {
  id: string;
  label: string;
  description: string;
  inputs: ("organism" | "gene" | "genus")[];
  build: (organism: string, taxonUri: string, geneUri: string) => string;
}

const TEMPLATES: Template[] = [
  {
    id: "variants_by_organism_gene",
    label: "Variants by organism + gene",
    description:
      "All variants involving a specific gene in a specific organism.",
    inputs: ["organism", "gene"],
    build: (org, _taxonUri, geneUri) => `${PREFIXES}
SELECT ?article ?sectionType ?sourceFrom ?sample ?taxon ?geneNode ?variant ?geneURI ?jbrowseUrl (COUNT(DISTINCT ?sample) AS ?nSampleNodes)
WHERE {
  ?article a dcmitype:Text .
  FILTER(STRSTARTS(STR(?article), "https://www.ncbi.nlm.nih.gov/pmc/articles/"))
  ?article dcterms:references ?section .
  ?section dcterms:source ?sourceFrom ;
  rdf:type ?sectionType .
  ?organism dcterms:source ?section ;
            biolink:in_taxon ?taxon .
  ?sample a sosa:Sample ;
          sosa:isSampleOf ?organism ;
	  rdfs:label ?taxonLabel ;
          sosa:hasFeatureOfInterest ?geneNode .
  VALUES ?taxonLabel { "${org}" }
  ?geneNode biolink:has_sequence_variant ?variant .
  ?variant rdfs:label ?variantLabel .
  OPTIONAL {
    ?geneNode dcterms:identifier ?geneURI .
    VALUES ?geneURI { "<${geneUri}>" }
  }
  OPTIONAL { ?sample dcterms:identifier ?accession . }
  BIND(REPLACE(STR(?taxonLabel), " ", "_") AS ?orgKey)
  BIND(IRI(CONCAT("http://localhost:5173/?organism=", ?orgKey)) AS ?jbrowseUrl)
}
GROUP BY ?article ?sample ?taxon ?sourceFrom ?sectionType ?geneNode ?variant ?geneURI ?jbrowseUrl
ORDER BY ?article DESC(?nSampleNodes)
`,
  },
  {
    id: "variants_by_organism",
    label: "All variants for an organism",
    description: "Every variant mentioned in papers about this organism.",
    inputs: ["organism"],
    build: (org, _taxonUri, _geneUri) => `${PREFIXES}
SELECT ?article ?sectionType ?sourceFrom ?sample ?taxon ?geneNode ?variant ?geneURI ?jbrowseUrl (COUNT(DISTINCT ?sample) AS ?nSampleNodes)
WHERE {
  ?article a dcmitype:Text .
  FILTER(STRSTARTS(STR(?article), "https://www.ncbi.nlm.nih.gov/pmc/articles/"))
  ?article dcterms:references ?section .
  ?section dcterms:source ?sourceFrom ;
  rdf:type ?sectionType .
  ?organism dcterms:source ?section ;
            biolink:in_taxon ?taxon .
  ?sample a sosa:Sample ;
          sosa:isSampleOf ?organism ;
	  rdfs:label ?taxonLabel ;
          sosa:hasFeatureOfInterest ?geneNode .
  VALUES ?taxonLabel { "${org}" }
  ?geneNode biolink:has_sequence_variant ?variant .
  ?variant rdfs:label ?variantLabel .
  OPTIONAL {
    ?geneNode dcterms:identifier ?geneURI .
  }
  OPTIONAL { ?sample dcterms:identifier ?accession . }
  BIND(REPLACE(STR(?taxonLabel), " ", "_") AS ?orgKey)
  BIND(IRI(CONCAT("http://localhost:5173/?organism=", ?orgKey)) AS ?jbrowseUrl)
}
GROUP BY ?article ?sample ?taxon ?sourceFrom ?sectionType ?geneNode ?variant ?geneURI ?jbrowseUrl
ORDER BY ?article DESC(?nSampleNodes)
`,
  },
  {
    id: "structural_variants_by_organism",
    label: "All structural variants for an organism",
    description:
      "Every structural variant mentioned in papers about this organism.",
    inputs: ["organism"],
    build: (org, _taxonUri, _geneUri) => `${PREFIXES}
    PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX dcmitype: <http://purl.org/dc/dcmitype/>
PREFIX sosa:    <http://www.w3.org/ns/sosa/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX mvikg:    <https://w3id.org/mvikg#>

SELECT ?article ?sectionType ?sourceFrom ?taxon ?varStart ?varEnd ?jbrowseUrl
WHERE {
  ?article a dcmitype:Text .
  FILTER(STRSTARTS(STR(?article), "https://www.ncbi.nlm.nih.gov/pmc/articles/"))
  ?article dcterms:references ?section .
  ?section dcterms:source ?sourceFrom ;
  rdf:type ?sectionType .
  ?organism dcterms:source ?section ;
            biolink:in_taxon ?taxon .
  ?sample a sosa:Sample ;
          sosa:isSampleOf ?organism ;
	      rdfs:label ?taxonLabel ;
          sosa:hasFeatureOfInterest ?geneNode .
  VALUES ?taxonLabel { "${org}" }
  ?geneNode biolink:has_sequence_variant ?variant .
  ?variant biolink:start_coordinate ?varStart ;
           biolink:end_coordinate ?varEnd .
  OPTIONAL { ?sample dcterms:identifier ?accession . }
  BIND(REPLACE(STR(?taxonLabel), " ", "_") AS ?orgKey)
  BIND(IRI(CONCAT("http://localhost:5173/?organism=", ?orgKey)) AS ?jbrowseUrl)
}`,
  },
  {
    id: "papers_by_gene",
    label: "Papers mentioning a gene",
    description: "All papers that annotate a specific gene.",
    inputs: ["gene"],
    build: (_org, _taxonUri, geneUri) => `${PREFIXES}
SELECT ?article ?sectionType ?sourceFrom ?sample ?taxon ?taxonLabel ?geneNode ?variant ?geneURI ?jbrowseUrl (COUNT(DISTINCT ?sample) AS ?nSampleNodes)
WHERE {
  ?article a dcmitype:Text .
  FILTER(STRSTARTS(STR(?article), "https://www.ncbi.nlm.nih.gov/pmc/articles/"))
  ?article dcterms:references ?section .
  ?section dcterms:source ?sourceFrom ;
  rdf:type ?sectionType .
  ?organism dcterms:source ?section ;
            biolink:in_taxon ?taxon .
  ?sample a sosa:Sample ;
          sosa:isSampleOf ?organism ;
	  rdfs:label ?taxonLabel ;
          sosa:hasFeatureOfInterest ?geneNode .
  ?geneNode biolink:has_sequence_variant ?variant .
  ?variant rdfs:label ?variantLabel .
  OPTIONAL {
    ?geneNode dcterms:identifier ?geneURI .
    VALUES ?geneURI { "<${geneUri}>" }
  }
  OPTIONAL { ?sample dcterms:identifier ?accession . }
  BIND(REPLACE(STR(?taxonLabel), " ", "_") AS ?orgKey)
  BIND(IRI(CONCAT("http://localhost:5173/?organism=", ?orgKey)) AS ?jbrowseUrl)
}
GROUP BY ?article ?sample ?taxon ?taxonLabel ?sourceFrom ?sectionType ?geneNode ?variant ?geneURI ?jbrowseUrl
ORDER BY ?article DESC(?nSampleNodes)
`,
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
    id: "variants_by_genus",
    label: "All variants for a genus / species",
    description:
      "Every strain matching a genus or species name, with variant counts and JBrowse links.",
    inputs: ["genus"],
    build: (genus) => `${PREFIXES}
SELECT ?strainLabel ?accession (COUNT(DISTINCT ?variant) AS ?variantCount) ?jbrowseUrl
WHERE {
  ?taxon rdfs:label ?strainLabel .
  ?taxon <http://purl.org/dc/terms/identifier> ?accession .
  ?taxon <http://www.w3.org/ns/sosa/hasFeatureOfInterest> ?geneNode .
  ?geneNode biolink:has_sequence_variant ?variant .
  FILTER(CONTAINS(LCASE(STR(?strainLabel)), LCASE("${genus}")))
  BIND(REPLACE(STR(?strainLabel), " ", "_") AS ?orgKey)
  BIND(IRI(CONCAT("http://localhost:5173/?organism=", ?orgKey, "&accession=", STR(?accession))) AS ?jbrowseUrl)
}
GROUP BY ?strainLabel ?accession ?jbrowseUrl
ORDER BY ?strainLabel`,
  },
  {
    id: "genes_cooccurring",
    label: "Genes co-occurring with organism in a paper",
    description:
      "All genes annotated alongside this organism in the same paper.",
    inputs: ["organism"],
    build: (_org, taxonUri, _geneUri) => `${PREFIXES}
SELECT ?geneLabel (COUNT(DISTINCT ?doc) AS ?paperCount) WHERE {
  ?sample biolink:in_taxon ${taxonUri ? `<${taxonUri}>` : "?taxonLabel"} .
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
// Custom query helpers — apply graph edits to the custom SPARQL text
// ---------------------------------------------------------------------------

function renameVariableInSparql(
  sparql: string,
  oldName: string,
  newName: string,
): string {
  // Replace ?oldName as a whole word throughout the query
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sparql.replace(
    new RegExp(`\\?${escaped}(?=[^a-zA-Z0-9_])`, "g"),
    `?${newName}`,
  );
}

function changePredicateInSparql(
  sparql: string,
  oldPred: string,
  newPred: string,
): string {
  const escaped = oldPred.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sparql.replace(
    new RegExp(`(\\s)${escaped}(\\s)`, "g"),
    `$1${newPred}$2`,
  );
}

function addTripleToSparql(
  sparql: string,
  subject: string,
  predicate: string,
  object: string,
): string {
  // Insert new triple just before the closing } of WHERE { … }
  const upper = sparql.toUpperCase();
  const whereIdx = upper.indexOf("WHERE");
  if (whereIdx === -1) return sparql;
  let depth = 0;
  let closeIdx = -1;
  for (let i = whereIdx; i < sparql.length; i++) {
    if (sparql[i] === "{") depth++;
    else if (sparql[i] === "}") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return sparql;
  const line = `  ?${subject} ${predicate} ?${object} .\n`;
  return sparql.slice(0, closeIdx) + line + sparql.slice(closeIdx);
}

// ---------------------------------------------------------------------------
// QLever helpers
// ---------------------------------------------------------------------------

async function runSparql(
  query: string,
): Promise<{
  vars: string[];
  rows: Record<string, { type: string; value: string }>[];
}> {
  const params = new URLSearchParams({ query, action: "sparql_json" });
  const resp = await fetch(`${QLEVER_ENDPOINT}/sparql?${params}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!resp.ok) throw new Error(`QLever returned ${resp.status}`);
  const data = await resp.json();
  const vars: string[] = data.head?.vars ?? [];
  const rows = (data.results?.bindings ?? []) as Record<
    string,
    { type: string; value: string }
  >[];
  return { vars, rows };
}

async function fetchTaxonSuggestions(
  text: string,
): Promise<{ label: string; uri: string }[]> {
  if (text.length < 2) return [];
  const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX biolink: <https://biolink.github.io/biolink-model/biolink/>
SELECT DISTINCT ?taxon ?label WHERE {
  ?sample biolink:in_taxon ?taxon .
  OPTIONAL { ?taxon rdfs:label ?label . }
  FILTER(CONTAINS(LCASE(COALESCE(STR(?label), STR(?taxon))), LCASE("${text.replace(/"/g, "")}")))
}
LIMIT 10`;
  try {
    const { rows } = await runSparql(query);
    return rows
      .map((r) => ({
        uri: r.taxon?.value ?? "",
        label: r.label?.value ?? r.taxon?.value ?? "",
      }))
      .filter((r) => r.uri);
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

function TypeaheadInput({
  value,
  onChange,
  onSelectUri,
  fetchSuggestions,
  placeholder,
  disabled,
}: TypeaheadProps) {
  const [suggestions, setSuggestions] = useState<
    { label: string; uri: string }[]
  >([]);
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

const MANIFEST_URL = "/sample-data/variants/manifest.json";

function ResultsTable({
  vars,
  rows,
}: {
  vars: string[];
  rows: Record<string, { type: string; value: string }>[];
}) {
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    fetch(MANIFEST_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => setManifest(m ?? {}))
      .catch(() => setManifest({}));
  }, []);

  if (rows.length === 0) return <p style={{ color: "#6b7280" }}>No results.</p>;

  const hasJbrowse = vars.includes("jbrowseUrl");

  return (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <p style={{ color: "#6b7280", marginBottom: 8 }}>{rows.length} row(s)</p>
      <table
        style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}
      >
        <thead>
          <tr>
            {vars.map((v) => (
              <th key={v} style={thStyle}>
                {v}
              </th>
            ))}
            {hasJbrowse && <th style={thStyle}>Visualise</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            // Extract organism key from ?jbrowseUrl value, e.g. /?organism=Bacteroides_fragilis_NCTC_9343
            const jbrowseVal = row["jbrowseUrl"]?.value ?? "";
            let orgKey = "";
            try {
              orgKey = new URL(jbrowseVal).searchParams.get("organism") ?? "";
            } catch {
              /* not a valid URL */
            }
            const inManifest =
              manifest !== null && orgKey !== "" && orgKey in manifest;

            return (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                {vars.map((v) => {
                  const cell = row[v];
                  const val = cell?.value ?? "";
                  const isUri = cell?.type === "uri";
                  // jbrowseUrl column: always show the organism key as plain text (link handled in extra column)
                  if (v === "jbrowseUrl") {
                    return (
                      <td key={v} style={tdStyle}>
                        {orgKey || val}
                      </td>
                    );
                  }
                  return (
                    <td key={v} style={tdStyle}>
                      {isUri ? (
                        <a
                          href={val}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb" }}
                        >
                          {val.split("/").pop() || val}
                        </a>
                      ) : (
                        val
                      )}
                    </td>
                  );
                })}
                {hasJbrowse && (
                  <td style={tdStyle}>
                    {orgKey && (
                      <a
                        href={jbrowseVal}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          background: inManifest ? "#2563eb" : "#6b7280",
                          color: "#fff",
                          borderRadius: 4,
                          fontSize: 12,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inManifest
                          ? "View in JBrowse"
                          : "View variants (KG only)"}
                      </a>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
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
  const [geneUri, setGene] = useState("");
  const [sparql, setSparql] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customSparql, setCustomSparql] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    vars: string[];
    rows: Record<string, { type: string; value: string }>[];
  } | null>(null);

  const template = TEMPLATES.find((t) => t.id === templateId)!;

  const buildQuery = useCallback(() => {
    const q = template.build(organism, taxonUri, geneUri);
    setSparql(q);
    setResults(null);
    setError(null);
  }, [template, organism, taxonUri, geneUri]);

  // Rebuild when template changes
  useEffect(() => {
    setSparql(template.build(organism, taxonUri, geneUri));
    setResults(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const r = await runSparql(showCustom ? customSparql : sparql);
      setResults(r);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setRunning(false);
    }
  };

  const handleStartCustom = () => {
    setCustomSparql(sparql);
    setShowCustom(true);
  };

  const handleDiscardCustom = () => {
    setShowCustom(false);
    setCustomSparql("");
    setResults(null);
    setError(null);
  };

  const handleNodeRename = (oldName: string, newName: string) => {
    setCustomSparql((prev) => renameVariableInSparql(prev, oldName, newName));
  };

  const handlePredicateChange = (oldPred: string, newPred: string) => {
    setCustomSparql((prev) => changePredicateInSparql(prev, oldPred, newPred));
  };

  const handleAddTriple = (
    subject: string,
    predicate: string,
    object: string,
  ) => {
    setCustomSparql((prev) =>
      addTripleToSparql(prev, subject, predicate, object),
    );
  };

  const needsOrganism = template.inputs.includes("organism");
  const needsGene = template.inputs.includes("gene");

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        maxWidth: 1400,
      }}
    >
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
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "6px 0 16px" }}>
            {template.description}
          </p>

          {template.inputs.includes("genus") && (
            <>
              <label style={labelStyle}>Genus / species</label>
              <input
                type="text"
                value={organism}
                onChange={(e) => setOrganism(e.target.value)}
                placeholder="e.g. Bacteroides"
                style={inputStyle}
              />
              {organism && (
                <a
                  href={`/?genus=${encodeURIComponent(organism)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    marginTop: 8,
                    padding: "7px 14px",
                    background: "#7c3aed",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  View all strains in JBrowse ↗
                </a>
              )}
            </>
          )}

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
                <p
                  style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}
                >
                  {taxonUri.split("/").pop()}
                </p>
              )}
            </>
          )}

          {needsGene && (
            <>
              <label
                style={{ ...labelStyle, marginTop: needsOrganism ? 16 : 0 }}
              >
                Gene / region
              </label>
              <input
                type="text"
                value={geneUri}
                onChange={(e) => setGene(e.target.value)}
                placeholder="e.g. https://www.ncbi.nlm.nih.gov/gene/1252749"
                style={inputStyle}
              />
            </>
          )}

          <button onClick={buildQuery} style={buildBtnStyle}>
            Build query
          </button>
        </div>

        {/* ── Right panel ── */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
        >
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
          {!showCustom && (
            <div style={customisePromptStyle}>
              <span style={{ color: "#374151", fontSize: 13 }}>
                Want to customise this query using the graph below?
              </span>
              <button onClick={handleStartCustom} style={customiseBtnStyle}>
                Yes, create a custom copy
              </button>
            </div>
          )}

          {error && (
            <pre
              style={{
                color: "#991b1b",
                background: "#fef2f2",
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                overflow: "auto",
              }}
            >
              {error}
            </pre>
          )}
        </div>
      </div>

      {/* ── Custom query section ── */}
      {showCustom && (
        <div style={customSectionStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <label style={{ ...labelStyle, color: "#059669" }}>
              ✎ Custom query
              <span
                style={{
                  fontWeight: 400,
                  color: "#6b7280",
                  fontSize: 12,
                  marginLeft: 8,
                }}
              >
                (independent copy — template above is unchanged)
              </span>
            </label>
            <button onClick={handleDiscardCustom} style={discardBtnStyle}>
              Discard custom query
            </button>
          </div>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 8px" }}>
            Edit directly in the textarea, or use the graph below — double-click
            a node to rename a variable, double-click a predicate label to
            change it. PREFIX, SELECT, FILTER and BIND lines are preserved.
          </p>
          <textarea
            value={customSparql}
            onChange={(e) => setCustomSparql(e.target.value)}
            rows={22}
            spellCheck={false}
            style={{ ...textareaStyle, borderColor: "#6ee7b7" }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <button
              onClick={handleRun}
              disabled={running || !customSparql.trim()}
              style={runBtnStyle(running || !customSparql.trim())}
            >
              {running ? "Running…" : "▶  Run custom query"}
            </button>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Endpoint: {QLEVER_ENDPOINT}
            </span>
          </div>
        </div>
      )}

      <MVIKGQueryGraph
        sparql={showCustom ? customSparql : sparql}
        organism={organism}
        geneUri={geneUri}
        qleverEndpoint={QLEVER_ENDPOINT}
        editMode={showCustom}
        onNodeRename={showCustom ? handleNodeRename : undefined}
        onPredicateChange={showCustom ? handlePredicateChange : undefined}
        onAddTriple={showCustom ? handleAddTriple : undefined}
      />

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
  width: "100%",
  boxSizing: "border-box",
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

const customisePromptStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: 6,
  marginTop: 4,
};

const customiseBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "#059669",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const customSectionStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "16px 20px",
  border: "2px solid #6ee7b7",
  borderRadius: 8,
  background: "#f9fffe",
};

const discardBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#dc2626",
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};
