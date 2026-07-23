/**
 * ContributeDataPanel — "Contribute data" modal on the /query page.
 *
 * Offers three ways for a user to submit information to the MVIKG:
 *   A) PMC ID          — ask us to curate a specific paper.
 *   B) Nanopublication  — submit a structured assertion via a schema-driven form.
 *   C) SPARQL INSERT    — submit a raw INSERT DATA / INSERT WHERE query.
 *
 * All three POST to the submission API (submission_api.py) and land in a
 * staging area for review — nothing here writes to the production KG
 * directly. Status is polled via GET /submit/status/{id}.
 */

import React, { useState } from "react";

const SUBMISSION_API =
  (import.meta.env.VITE_SUBMISSION_API_ENDPOINT as string) ||
  "http://localhost:8002";

type Tab = "pmc" | "nanopub" | "sparql";

interface SubmitResult {
  id: string;
  kind: string;
  status: string;
  message: string;
}

async function postJson(path: string, body: unknown): Promise<SubmitResult> {
  const resp = await fetch(`${SUBMISSION_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok)
    throw new Error(data?.detail ?? `Request failed (${resp.status})`);
  return data as SubmitResult;
}

export default function ContributeDataPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("pmc");

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>Contribute data to MVIKG</h3>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
            ✕
          </button>
        </div>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Submissions are staged for review — they are not added to the
          knowledge graph automatically.
        </p>

        <div style={tabRowStyle}>
          <TabButton active={tab === "pmc"} onClick={() => setTab("pmc")}>
            📄 Suggest a paper (PMC ID)
          </TabButton>
          <TabButton
            active={tab === "nanopub"}
            onClick={() => setTab("nanopub")}
          >
            🧬 Submit a nanopublication
          </TabButton>
          <TabButton active={tab === "sparql"} onClick={() => setTab("sparql")}>
            ⌨ SPARQL INSERT
          </TabButton>
        </div>

        <div style={{ marginTop: 16 }}>
          {tab === "pmc" && <PmcForm />}
          {tab === "nanopub" && <NanopubForm />}
          {tab === "sparql" && <SparqlInsertForm />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={tabBtnStyle(active)}>
      {children}
    </button>
  );
}

function SubmitStatus({
  result,
  error,
}: {
  result: SubmitResult | null;
  error: string | null;
}) {
  if (error) {
    return <p style={{ color: "#991b1b", fontSize: 13 }}>{error}</p>;
  }
  if (result) {
    return (
      <p style={{ color: "#059669", fontSize: 13 }}>
        Submitted — job <code>{result.id}</code>: {result.message}
      </p>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tab A — PMC ID
// ---------------------------------------------------------------------------

// Splits on commas, whitespace, and newlines so users can paste a list
// however they naturally format it ("PMC1, PMC2", one-per-line, etc).
function splitPmcIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface PmcBatchResult {
  accepted: SubmitResult[];
  rejected: { input: string; reason: string }[];
}

function PmcForm() {
  const [pmcIdsRaw, setPmcIdsRaw] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PmcBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ids = splitPmcIds(pmcIdsRaw);
  const validCount = ids.filter((id) => /^pmc\d+$/i.test(id)).length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch(`${SUBMISSION_API}/submit/pmc/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pmcIds: ids, submitterNote: note || null }),
      });
      const data = await resp.json();
      if (!resp.ok)
        throw new Error(data?.detail ?? `Request failed (${resp.status})`);
      setResult(data as PmcBatchResult);
      setPmcIdsRaw("");
      setNote("");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label style={labelStyle}>PMC ID(s)</label>
      <textarea
        value={pmcIdsRaw}
        onChange={(e) => setPmcIdsRaw(e.target.value)}
        placeholder={"e.g. PMC1234567\nPMC7654321, PMC1112223"}
        style={{ ...textareaStyle, height: 80, fontFamily: "monospace" }}
      />
      <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
        Separate multiple IDs with commas, spaces, or newlines.
        {ids.length > 0 && ` (${validCount}/${ids.length} look valid)`}
      </p>
      <label style={{ ...labelStyle, marginTop: 12 }}>
        Note to curators (optional)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why are these papers relevant?"
        style={{ ...textareaStyle, height: 70 }}
      />
      <button
        onClick={submit}
        disabled={busy || validCount === 0}
        style={submitBtnStyle(busy || validCount === 0)}
      >
        {busy
          ? "Submitting…"
          : `Submit ${validCount || ""} for curation`.trim()}
      </button>
      {error && <p style={{ color: "#991b1b", fontSize: 13 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          {result.accepted.map((r) => (
            <p key={r.id} style={{ color: "#059669", margin: "2px 0" }}>
              ✓ {r.id}: {r.message}
            </p>
          ))}
          {result.rejected.map((r, i) => (
            <p key={i} style={{ color: "#991b1b", margin: "2px 0" }}>
              ✗ {r.input}: {r.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab B — Nanopublication (schema-driven form; fields to be extended once
// the SHACL shape derived from ontology-mutations lands)
// ---------------------------------------------------------------------------

function NanopubForm() {
  const [fields, setFields] = useState({
    organism: "",
    gene: "",
    variant: "",
    phenotype: "",
    biome: "",
    evidence: "",
    sourceArticle: "",
    freeTextJustification: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await postJson("/submit/nanopub", fields);
      setResult(r);
      setFields({
        organism: "",
        gene: "",
        variant: "",
        phenotype: "",
        biome: "",
        evidence: "",
        sourceArticle: "",
        freeTextJustification: "",
      });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = fields.organism || fields.gene || fields.variant;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <label style={labelStyle}>Organism</label>
        <input
          value={fields.organism}
          onChange={set("organism")}
          style={inputStyle}
          placeholder="e.g. Bacteroides fragilis"
        />
      </div>
      <div>
        <label style={labelStyle}>Gene</label>
        <input
          value={fields.gene}
          onChange={set("gene")}
          style={inputStyle}
          placeholder="gene symbol or URI"
        />
      </div>
      <div>
        <label style={labelStyle}>Variant</label>
        <input
          value={fields.variant}
          onChange={set("variant")}
          style={inputStyle}
          placeholder="e.g. p.Ala123Val"
        />
      </div>
      <div>
        <label style={labelStyle}>Phenotype</label>
        <input
          value={fields.phenotype}
          onChange={set("phenotype")}
          style={inputStyle}
          placeholder="e.g. antibiotic resistance"
        />
      </div>
      <div>
        <label style={labelStyle}>Biome</label>
        <input
          value={fields.biome}
          onChange={set("biome")}
          style={inputStyle}
          placeholder="e.g. human gut"
        />
      </div>
      <div>
        <label style={labelStyle}>Evidence code</label>
        <input
          value={fields.evidence}
          onChange={set("evidence")}
          style={inputStyle}
          placeholder="e.g. ECO:0000035"
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Source article (PMC ID or URL)</label>
        <input
          value={fields.sourceArticle}
          onChange={set("sourceArticle")}
          style={inputStyle}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Justification (free text)</label>
        <textarea
          value={fields.freeTextJustification}
          onChange={set("freeTextJustification")}
          style={{ ...textareaStyle, height: 70 }}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <button
          onClick={submit}
          disabled={busy || !canSubmit}
          style={submitBtnStyle(busy || !canSubmit)}
        >
          {busy ? "Submitting…" : "Submit nanopublication"}
        </button>
        <SubmitStatus result={result} error={error} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab C — SPARQL INSERT (goes to a staging store, never prod QLever)
// ---------------------------------------------------------------------------

function SparqlInsertForm() {
  const [query, setQuery] = useState(
    "PREFIX mvikg: <https://w3id.org/mvikg#>\nINSERT DATA {\n  # your triples here\n}",
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await postJson("/submit/sparql-insert", { query });
      setResult(r);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0 }}>
        Only <code>INSERT DATA</code> / <code>INSERT WHERE</code> is accepted.
        Runs against an isolated staging store, not the live MVIKG endpoint.
      </p>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        spellCheck={false}
        style={{ ...textareaStyle, height: 180, fontFamily: "monospace" }}
      />
      <button
        onClick={submit}
        disabled={busy || !query.trim()}
        style={submitBtnStyle(busy || !query.trim())}
      >
        {busy ? "Submitting…" : "Submit INSERT"}
      </button>
      <SubmitStatus result={result} error={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 24,
  width: "min(720px, 92vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
  color: "#6b7280",
};

const tabRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 16,
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 8,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  background: active ? "#1d4ed8" : "#f3f4f6",
  color: active ? "#fff" : "#374151",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
});

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
  width: "100%",
  padding: 10,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
  lineHeight: 1.5,
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  marginTop: 14,
  padding: "9px 18px",
  background: disabled ? "#9ca3af" : "#059669",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
  fontSize: 13,
});
