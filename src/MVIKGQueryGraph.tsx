/**
 * MVIKGQueryGraph — interactive node-link diagram derived LIVE from the
 * SPARQL query string.  Instead of a static declarative list of triples,
 * this component parses the WHERE clause of whatever SPARQL is currently in
 * the textarea and builds the graph on the fly.  Changing the query — adding
 * a triple, removing an OPTIONAL, binding a new variable — is immediately
 * reflected in the diagram.
 *
 * Props
 * -----
 *  sparql    : string  – the raw SPARQL text (kept in sync with the textarea)
 *  organism  : string  – current organism input value (for bound-node colouring)
 *  geneUri   : string  – current gene URI input value (for bound-node colouring)
 */

import React, { useMemo, useState } from "react";
import { useMVIKGSchema, getValidPredicates, SchemaEntry } from "./useMVIKGSchema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphTriple {
  subject: string;
  predicate: string;
  object: string;
  optional: boolean;
  /** true when this triple is a VALUES binding for organism or gene */
  bindsTo?: "organism" | "gene";
}

// ---------------------------------------------------------------------------
// SPARQL → GraphTriple[] parser
// ---------------------------------------------------------------------------

/**
 * Strip PREFIX declarations and everything outside WHERE { … }.
 * Returns the WHERE body (possibly with nested { }) as a string.
 */
function extractWhereBody(sparql: string): string {
  const upper = sparql.toUpperCase();
  const whereIdx = upper.indexOf("WHERE");
  if (whereIdx === -1) return sparql; // fall back to full text
  let depth = 0;
  let start = -1;
  for (let i = whereIdx; i < sparql.length; i++) {
    if (sparql[i] === "{") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (sparql[i] === "}") {
      depth--;
      if (depth === 0) return sparql.slice(start, i);
    }
  }
  return sparql.slice(whereIdx);
}

/**
 * Remove a balanced-parenthesis construct (FILTER/BIND) starting at `idx`
 * where body[idx] must be '('. Returns the index just after the closing ')'.
 */
function skipBalancedParens(text: string, idx: number): number {
  let depth = 0;
  for (let i = idx; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

/**
 * Remove all FILTER(…) and BIND(…) blocks, handling nested parentheses
 * correctly. Returns the cleaned text and a Set of BIND result var names.
 */
function removeFiltersAndBinds(text: string): { cleaned: string; bindVars: Set<string> } {
  const bindVars = new Set<string>();
  let result = "";
  let i = 0;
  while (i < text.length) {
    const upper = text.slice(i).toUpperCase();
    if (upper.startsWith("FILTER")) {
      const parenIdx = text.indexOf("(", i + 6);
      if (parenIdx === -1) { result += text[i++]; continue; }
      i = skipBalancedParens(text, parenIdx);
    } else if (upper.startsWith("BIND")) {
      const parenIdx = text.indexOf("(", i + 4);
      if (parenIdx === -1) { result += text[i++]; continue; }
      // Extract BIND result var before removing
      const inner = text.slice(parenIdx + 1, skipBalancedParens(text, parenIdx) - 1);
      const asMatch = /AS\s+(\?[\w]+)/i.exec(inner);
      if (asMatch) bindVars.add(asMatch[1].slice(1));
      i = skipBalancedParens(text, parenIdx);
    } else {
      result += text[i++];
    }
  }
  return { cleaned: result, bindVars };
}

/**
 * Split text into "sentences" on bare `.` — i.e. `.` not inside
 * a string literal ("…") or URI (<…>).
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "<") {
      // consume URI
      const end = text.indexOf(">", i);
      if (end === -1) { current += text.slice(i); break; }
      current += text.slice(i, end + 1);
      i = end + 1;
    } else if (ch === '"' || ch === "'") {
      // consume string literal
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        if (text[j] === "\\") j++; // skip escape
        j++;
      }
      current += text.slice(i, j + 1);
      i = j + 1;
    } else if (ch === ".") {
      sentences.push(current);
      current = "";
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  if (current.trim()) sentences.push(current);
  return sentences;
}

/**
 * Flatten nested OPTIONAL { … } blocks, tagging their contents.
 * Returns an array of { text, optional } segments.
 */
function flattenOptionals(body: string): { text: string; optional: boolean }[] {
  const segments: { text: string; optional: boolean }[] = [];
  let i = 0;
  let currentText = "";
  const upper = body.toUpperCase();

  while (i < body.length) {
    // Look for OPTIONAL {
    const optIdx = upper.indexOf("OPTIONAL", i);
    if (optIdx === -1) {
      currentText += body.slice(i);
      break;
    }
    currentText += body.slice(i, optIdx);
    if (currentText.trim()) segments.push({ text: currentText, optional: false });
    currentText = "";

    // Find the matching { }
    let braceStart = body.indexOf("{", optIdx);
    if (braceStart === -1) break;
    let depth = 0;
    let j = braceStart;
    for (; j < body.length; j++) {
      if (body[j] === "{") depth++;
      else if (body[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const inner = body.slice(braceStart + 1, j);
    segments.push({ text: inner, optional: true });
    i = j + 1;
  }

  if (currentText.trim()) segments.push({ text: currentText, optional: false });
  return segments;
}

/**
 * Normalise a SPARQL term to a display name:
 *  ?varName    → "varName"
 *  <uri>       → last segment of URI, e.g. "sosa:Sample"
 *  "literal"   → the literal text (without quotes)
 *  prefix:name → kept as-is (it's a compact URI / class name)
 */
function normaliseTerm(raw: string): string {
  raw = raw.trim();
  if (raw.startsWith("?")) return raw.slice(1);
  if (raw.startsWith("<") && raw.endsWith(">")) {
    const uri = raw.slice(1, -1);
    // Return last path segment or fragment
    return uri.split(/[/#]/).filter(Boolean).pop() ?? uri;
  }
  if (raw.startsWith('"') || raw.startsWith("'")) {
    return raw.replace(/^["']|["'].*$/g, "").trim();
  }
  return raw; // prefix:local  or  keyword like "a"
}

/**
 * Parse triple patterns from a WHERE-body segment.
 * Handles:
 *   ?s pred ?o .
 *   ?s pred ?o ;
 *      pred2 ?o2 .
 *   ?s a cls .
 *   FILTER(…)  → skipped
 *   BIND(…)    → skipped (but adds a synthetic node for BIND result)
 *   VALUES ?v { … } → adds a binding triple
 */
function parseTriplesFromSegment(text: string, optional: boolean): GraphTriple[] {
  const triples: GraphTriple[] = [];

  // Remove FILTER(…) and BIND(…), correctly handling nested parentheses.
  const { cleaned, bindVars: bindResultVars } = removeFiltersAndBinds(text);
  text = cleaned;

  // Handle VALUES ?var { "lit1" "lit2" }
  const valuesRe = /VALUES\s+(\?[\w]+)\s*\{([^}]*)\}/gi;
  let vm: RegExpExecArray | null;
  while ((vm = valuesRe.exec(text)) !== null) {
    const varName = vm[1].slice(1);
    // Detect whether this binds organism or gene based on heuristic on the
    // surrounding variable name.
    let bindsTo: "organism" | "gene" | undefined;
    if (/taxon|organism/i.test(varName)) bindsTo = "organism";
    else if (/gene|geneuri/i.test(varName)) bindsTo = "gene";
    triples.push({
      subject: varName,
      predicate: "VALUES",
      object: `[${varName} input]`,
      optional,
      bindsTo,
    });
  }
  text = text.replace(valuesRe, "");

  // Tokenise remaining into subject–predicate–object sequences, respecting
  // ";" (same subject, new pred/obj) and "," (same subject+pred, new obj).
  // Strategy: split by bare "." (respecting literals and URIs), then handle ";"
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Split by ";" to get multiple pred-obj pairs for the same subject
    const parts = trimmed.split(";");
    let currentSubject = "";

    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi].trim();
      if (!part) continue;

      // Tokenise the part
      const tokens = tokenise(part);
      if (tokens.length === 0) continue;

      if (pi === 0) {
        // First part: subject pred obj [obj2, obj3]
        if (tokens.length < 3) {
          // maybe just subject with no pred/obj in this segment
          if (tokens.length === 1 && tokens[0].startsWith("?")) {
            currentSubject = normaliseTerm(tokens[0]);
          }
          continue;
        }
        currentSubject = normaliseTerm(tokens[0]);
        const pred = normaliseTerm(tokens[1]);
        // Remaining tokens are objects, comma-separated
        const objTokens = tokens.slice(2).join(" ").split(",").map((s) => s.trim()).filter(Boolean);
        for (const obj of objTokens) {
          if (obj) {
            triples.push({
              subject: currentSubject,
              predicate: pred,
              object: normaliseTerm(obj),
              optional,
            });
          }
        }
      } else {
        // Continuation: pred obj
        if (!currentSubject) continue;
        if (tokens.length < 2) continue;
        const pred = normaliseTerm(tokens[0]);
        const objTokens = tokens.slice(1).join(" ").split(",").map((s) => s.trim()).filter(Boolean);
        for (const obj of objTokens) {
          if (obj) {
            triples.push({
              subject: currentSubject,
              predicate: pred,
              object: normaliseTerm(obj),
              optional,
            });
          }
        }
      }
    }
  }

  return triples;
}

/**
 * Simple tokeniser that respects <uri>, "string", and whitespace.
 */
function tokenise(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text[i] === "<") {
      const end = text.indexOf(">", i);
      if (end === -1) { tokens.push(text.slice(i)); break; }
      tokens.push(text.slice(i, end + 1));
      i = end + 1;
    } else if (text[i] === '"' || text[i] === "'") {
      const q = text[i];
      let j = i + 1;
      while (j < text.length && text[j] !== q) j++;
      tokens.push(text.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < text.length && !/[\s,;]/.test(text[j])) j++;
      const tok = text.slice(i, j);
      if (tok) tokens.push(tok);
      i = j;
      if (i < text.length && text[i] === ",") i++; // consume comma
    }
  }
  return tokens.filter(Boolean);
}

/**
 * Top-level: parse a full SPARQL string into GraphTriples.
 */
export function parseSparqlToTriples(sparql: string): GraphTriple[] {
  if (!sparql.trim()) return [];
  const body = extractWhereBody(sparql);
  const segments = flattenOptionals(body);
  const all: GraphTriple[] = [];
  for (const seg of segments) {
    all.push(...parseTriplesFromSegment(seg.text, seg.optional));
  }
  // Deduplicate (same subject+predicate+object)
  const seen = new Set<string>();
  return all.filter((t) => {
    const key = `${t.subject}|${t.predicate}|${t.object}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Infer a root node: prefer the first SELECT variable, or the most-connected node.
 */
function inferRoot(sparql: string, triples: GraphTriple[]): string {
  // Try to grab first SELECT variable
  const sel = /SELECT\s+(?:DISTINCT\s+)?\?(\w+)/i.exec(sparql);
  if (sel) return sel[1];
  if (triples.length === 0) return "";
  // Fall back to most-connected node
  const degree = new Map<string, number>();
  for (const t of triples) {
    degree.set(t.subject, (degree.get(t.subject) ?? 0) + 1);
    degree.set(t.object, (degree.get(t.object) ?? 0) + 1);
  }
  return [...degree.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// ---------------------------------------------------------------------------
// Type inference: map variable name → RDF type short name from "?x a Type" triples
// ---------------------------------------------------------------------------

function inferNodeTypes(triples: GraphTriple[]): Map<string, string> {
  const types = new Map<string, string>();
  for (const t of triples) {
    if (t.predicate === "a" || t.predicate === "rdf:type" || t.predicate === "type") {
      types.set(t.subject, t.object);
    }
  }
  return types;
}

// ---------------------------------------------------------------------------
// Layout: BFS layering from the root variable.
// ---------------------------------------------------------------------------

interface LayoutNode {
  id: string;
  layer: number;
  x: number;
  y: number;
}

const NODE_W = 140;
const NODE_H = 40;
const LAYER_GAP_Y = 100;  // vertical gap between layers
const NODE_GAP_X = 160;   // horizontal gap between nodes within a layer

function isVariableNode(name: string): boolean {
  return !name.includes(":") && !name.includes(" ") && !name.startsWith("[");
}

function layoutGraph(root: string, triples: GraphTriple[]) {
  const nodeIds = new Set<string>();
  for (const t of triples) {
    nodeIds.add(t.subject);
    nodeIds.add(t.object);
  }
  if (!nodeIds.has(root) && nodeIds.size > 0) {
    root = [...nodeIds][0];
  }

  // Directed adjacency for BFS (follow edge direction for layering)
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const t of triples) {
    adjacency.get(t.subject)?.push(t.object);
    // Also allow upward traversal so disconnected subgraphs get layered
    adjacency.get(t.object)?.push(t.subject);
  }

  const layer = new Map<string, number>();
  if (root) {
    layer.set(root, 0);
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift()!;
      const curLayer = layer.get(cur)!;
      for (const next of adjacency.get(cur) ?? []) {
        if (!layer.has(next)) {
          layer.set(next, curLayer + 1);
          queue.push(next);
        }
      }
    }
  }
  const maxLayer = Math.max(0, ...Array.from(layer.values()));
  for (const id of nodeIds) {
    if (!layer.has(id)) layer.set(id, maxLayer + 1);
  }

  const byLayer = new Map<number, string[]>();
  for (const id of nodeIds) {
    const l = layer.get(id)!;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }

  // Top-to-bottom layout: layers go down (y), nodes spread horizontally (x)
  const nodes = new Map<string, LayoutNode>();
  let maxCols = 0;
  for (const [l, ids] of byLayer) {
    ids.sort();
    maxCols = Math.max(maxCols, ids.length);
    ids.forEach((id, i) => {
      nodes.set(id, {
        id,
        layer: l,
        x: i * NODE_GAP_X + 20,
        y: l * LAYER_GAP_Y + 20,
      });
    });
  }

  const width = Math.max(maxCols * NODE_GAP_X + NODE_W, 420);
  const height = (maxLayer + 1) * LAYER_GAP_Y + NODE_H + 20;
  return { nodes, width, height };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MVIKGQueryGraphProps {
  sparql: string;
  organism: string;
  geneUri: string;
  /** QLever endpoint for schema introspection (used in edit mode) */
  qleverEndpoint?: string;
  /** When true, double-click interactions are enabled for graph editing */
  editMode?: boolean;
  /** Called when user renames a variable node */
  onNodeRename?: (oldName: string, newName: string) => void;
  /** Called when user changes a predicate label on an edge */
  onPredicateChange?: (oldPred: string, newPred: string) => void;
  /** Called when user adds a new triple via the + button */
  onAddTriple?: (subject: string, predicate: string, object: string) => void;
}

export default function MVIKGQueryGraph({
  sparql,
  organism,
  geneUri,
  qleverEndpoint = "",
  editMode = false,
  onNodeRename,
  onPredicateChange,
  onAddTriple,
}: MVIKGQueryGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; value: string } | null>(null);
  const [editingEdge, setEditingEdge] = useState<{ idx: number; value: string; isOther: boolean } | null>(null);
  const [addingFrom, setAddingFrom] = useState<string | null>(null);
  const [addPred, setAddPred] = useState("");
  const [addPredIsOther, setAddPredIsOther] = useState(false);
  const [addObject, setAddObject] = useState("");

  const { schema, loading: schemaLoading, allPredicates } = useMVIKGSchema(editMode ? qleverEndpoint : "");

  // Re-parse whenever the sparql string changes
  const triples = useMemo(() => parseSparqlToTriples(sparql), [sparql]);
  const root = useMemo(() => inferRoot(sparql, triples), [sparql, triples]);
  const { nodes, width, height } = useMemo(() => layoutGraph(root, triples), [root, triples]);
  const nodeTypes = useMemo(() => inferNodeTypes(triples), [triples]);

  const activeId = selected ?? hovered;

  const isTripleActive = (t: GraphTriple) =>
    activeId === null || t.subject === activeId || t.object === activeId;

  const isNodeActive = (id: string) =>
    activeId === null ||
    id === activeId ||
    triples.some(
      (t) => (t.subject === activeId && t.object === id) || (t.object === activeId && t.subject === id)
    );

  const isBound = (id: string) => {
    const t = triples.find((tr) => tr.object === id && tr.bindsTo);
    if (!t) return false;
    if (t.bindsTo === "organism") return organism.trim().length > 0;
    if (t.bindsTo === "gene") return geneUri.trim().length > 0;
    return false;
  };

  const handleNodeClick = (id: string) => {
    setSelected((cur) => (cur === id ? null : id));
  };

  const handleNodeDoubleClick = (id: string) => {
    if (!editMode) return;
    setEditingNode({ id, value: id });
  };

  const commitNodeRename = () => {
    if (!editingNode) return;
    const newName = editingNode.value.trim().replace(/^\?/, "");
    if (newName && newName !== editingNode.id && onNodeRename) {
      onNodeRename(editingNode.id, newName);
    }
    setEditingNode(null);
  };

  const handleEdgeDoubleClick = (idx: number, predicate: string) => {
    if (!editMode) return;
    setEditingEdge({ idx, value: predicate, isOther: false });
  };

  const commitPredicateChange = () => {
    if (!editingEdge) return;
    const t = triples[editingEdge.idx];
    const newVal = editingEdge.value.trim();
    if (t && newVal && newVal !== t.predicate && onPredicateChange) {
      onPredicateChange(t.predicate, newVal);
    }
    setEditingEdge(null);
  };

  const handleAddTripleSubmit = () => {
    if (!addingFrom || !addPred.trim() || !addObject.trim()) return;
    const obj = addObject.trim().replace(/^\?/, "");
    onAddTriple?.(addingFrom, addPred.trim(), obj);
    setAddingFrom(null);
    setAddPred("");
    setAddPredIsOther(false);
    setAddObject("");
  };

  if (triples.length === 0) {
    return (
      <div style={containerStyle}>
        <label style={labelStyle}>Query graph</label>
        <p style={hintStyle}>Build a query to see its graph.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <label style={labelStyle}>
          Query graph{editMode && <span style={{ color: "#059669", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>✎ edit mode</span>}
        </label>
        {selected && (
          <button onClick={() => setSelected(null)} style={clearBtnStyle}>
            Clear selection
          </button>
        )}
      </div>
      <p style={hintStyle}>
        {editMode
          ? <>Graph is <strong>editable</strong>. Double-click a node to rename a variable. Double-click a predicate label to change it. Press Enter to confirm, Escape to cancel.</>
          : <>The graph updates live as you edit the query. Click a node to trace connected triples. Dashed lines are <code style={codeStyle}>OPTIONAL</code>. Filled nodes have a value you've entered.</>}
      </p>
      <div style={{ position: "relative", overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fafafa" }}>
        <svg width={width} height={height} style={{ display: "block" }}>
          <defs>
            <marker id="qg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9ca3af" />
            </marker>
            <marker id="qg-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#1d4ed8" />
            </marker>
          </defs>

          {/* Edges */}
          {triples.map((t, i) => {
            const a = nodes.get(t.subject);
            const b = nodes.get(t.object);
            if (!a || !b) return null;
            const active = isTripleActive(t);
            const x1 = a.x + NODE_W / 2;
            const y1 = a.y + NODE_H;
            const x2 = b.x + NODE_W / 2;
            const y2 = b.y;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const cy1 = y1 + (y2 - y1) * 0.4;
            const cy2 = y2 - (y2 - y1) * 0.4;
            const isEditingThisEdge = editingEdge?.idx === i;
            return (
              <g key={i} opacity={active ? 1 : 0.25}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={active && activeId ? "#1d4ed8" : "#9ca3af"}
                  strokeWidth={active && activeId ? 2 : 1.5}
                  strokeDasharray={t.optional ? "5,4" : undefined}
                  markerEnd={active && activeId ? "url(#qg-arrow-active)" : "url(#qg-arrow)"}
                  onMouseEnter={() =>
                    setTooltip({ x: midX, y: midY, text: `${t.subject} → ${t.predicate} → ${t.object}${t.optional ? "  (optional)" : ""}` })
                  }
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "default" }}
                />
                {isEditingThisEdge ? (
                  <foreignObject x={midX - 90} y={midY - 16} width={200} height={32}>
                    {editingEdge!.isOther ? (
                      <input
                        autoFocus
                        value={editingEdge!.value}
                        onChange={(e) => setEditingEdge({ ...editingEdge!, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitPredicateChange();
                          if (e.key === "Escape") setEditingEdge(null);
                        }}
                        onBlur={commitPredicateChange}
                        placeholder="e.g. dcterms:hasPart"
                        style={{ width: "100%", height: "100%", border: "2px solid #059669", borderRadius: 4, padding: "0 4px", fontFamily: "monospace", fontSize: 10, background: "#f0fdf4", outline: "none" }}
                      />
                    ) : (
                      <select
                        autoFocus
                        value={editingEdge!.value}
                        onChange={(e) => {
                          if (e.target.value === "__other__") {
                            setEditingEdge({ ...editingEdge!, value: "", isOther: true });
                          } else {
                            setEditingEdge({ ...editingEdge!, value: e.target.value });
                            // commit immediately on selection
                            const t = triples[editingEdge!.idx];
                            if (t && e.target.value && e.target.value !== t.predicate && onPredicateChange) {
                              onPredicateChange(t.predicate, e.target.value);
                            }
                            setEditingEdge(null);
                          }
                        }}
                        onBlur={() => setEditingEdge(null)}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingEdge(null); }}
                        style={{ width: "100%", height: "100%", border: "2px solid #059669", borderRadius: 4, fontFamily: "monospace", fontSize: 10, background: "#f0fdf4", outline: "none" }}
                      >
                        {schemaLoading && <option disabled>Loading schema…</option>}
                        {(() => {
                          const t = triples[i];
                          const subjType = nodeTypes.get(t.subject);
                          const objType = nodeTypes.get(t.object);
                          const preds = getValidPredicates(schema, subjType, objType);
                          const list = preds.length > 0 ? preds : allPredicates;
                          return list.map((p) => <option key={p} value={p}>{p}</option>);
                        })()}
                        <option value="__other__">Other…</option>
                      </select>
                    )}
                  </foreignObject>
                ) : (
                  <text
                    x={midX + 6}
                    y={midY}
                    textAnchor="start"
                    fontSize={10}
                    fill={active && activeId ? "#1d4ed8" : "#6b7280"}
                    style={{
                      fontFamily: "monospace",
                      cursor: editMode ? "text" : "default",
                      userSelect: "none",
                    }}
                    onDoubleClick={() => handleEdgeDoubleClick(i, t.predicate)}
                  >
                    {t.predicate}
                    {editMode && <tspan fill="#d1d5db" fontSize={8}> ✎</tspan>}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {Array.from(nodes.values()).map((n) => {
            const active = isNodeActive(n.id);
            const bound = isBound(n.id);
            const isVar = isVariableNode(n.id);
            const isSelected = selected === n.id;
            const isRoot = n.id === root;
            const isEditingThisNode = editingNode?.id === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                opacity={active ? 1 : 0.3}
                onClick={() => !isEditingThisNode && handleNodeClick(n.id)}
                onDoubleClick={() => isVar && handleNodeDoubleClick(n.id)}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: editMode && isVar ? "text" : "pointer" }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={isVar ? 8 : 4}
                  fill={isEditingThisNode ? "#f0fdf4" : bound ? "#dbeafe" : isRoot ? "#eff6ff" : isVar ? "#fff" : "#f3f4f6"}
                  stroke={isEditingThisNode ? "#059669" : isSelected ? "#1d4ed8" : bound ? "#60a5fa" : isRoot ? "#93c5fd" : "#d1d5db"}
                  strokeWidth={isEditingThisNode ? 2.5 : isSelected ? 2.5 : isRoot ? 2 : 1.5}
                />
                {isEditingThisNode ? (
                  <foreignObject x={4} y={4} width={NODE_W - 8} height={NODE_H - 8}>
                    <input
                      autoFocus
                      value={editingNode!.value}
                      onChange={(e) => setEditingNode({ id: n.id, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitNodeRename();
                        if (e.key === "Escape") setEditingNode(null);
                      }}
                      onBlur={commitNodeRename}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        background: "transparent",
                        fontFamily: "system-ui, sans-serif",
                        fontWeight: 600,
                        fontSize: 12,
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={NODE_W / 2}
                    y={NODE_H / 2 + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isVar ? 600 : 400}
                    fill={isVar ? "#1f2937" : "#6b7280"}
                    style={{ pointerEvents: "none", fontFamily: isVar ? "system-ui, sans-serif" : "monospace" }}
                  >
                    {isVar ? `?${n.id}` : n.id}
                    {editMode && isVar && <tspan fill="#d1d5db" fontSize={8}> ✎</tspan>}
                  </text>
                )}
                {/* + button to add a new outgoing triple */}
                {editMode && isVar && onAddTriple && (
                  <g
                    transform={`translate(${NODE_W / 2 - 10}, ${NODE_H + 4})`}
                    onClick={(e) => { e.stopPropagation(); setAddingFrom(n.id); setAddPred(""); setAddPredIsOther(false); setAddObject(""); }}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={10} cy={8} r={9} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={1.5} />
                    <text x={10} y={13} textAnchor="middle" fontSize={13} fill="#0369a1" style={{ pointerEvents: "none", fontWeight: 700 }}>+</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y - 28,
              transform: "translateX(-50%)",
              background: "#111827",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Add triple form — appears below graph when + is clicked */}
      {editMode && addingFrom && (
        <div style={addTripleFormStyle}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#0369a1" }}>
            Add triple from <code style={{ background: "#e0f2fe", padding: "1px 5px", borderRadius: 3 }}>?{addingFrom}</code>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Predicate:</span>
            {addPredIsOther ? (
              <input
                autoFocus
                value={addPred}
                onChange={(e) => setAddPred(e.target.value)}
                placeholder="e.g. dcterms:hasPart"
                style={addInputStyle}
              />
            ) : (
              <select
                value={addPred}
                onChange={(e) => {
                  if (e.target.value === "__other__") { setAddPredIsOther(true); setAddPred(""); }
                  else setAddPred(e.target.value);
                }}
                style={addInputStyle}
              >
                <option value="">— choose predicate —</option>
                {schemaLoading && <option disabled>Loading schema…</option>}
                {(() => {
                  const subjType = nodeTypes.get(addingFrom);
                  const preds = getValidPredicates(schema, subjType, undefined);
                  const list = preds.length > 0 ? preds : allPredicates;
                  return list.map((p) => <option key={p} value={p}>{p}</option>);
                })()}
                <option value="__other__">Other…</option>
              </select>
            )}
            <span style={{ fontSize: 12, color: "#374151" }}>→ Object variable:</span>
            <input
              value={addObject}
              onChange={(e) => setAddObject(e.target.value)}
              placeholder="e.g. newVar"
              style={{ ...addInputStyle, width: 120 }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTripleSubmit(); if (e.key === "Escape") setAddingFrom(null); }}
            />
            <button
              onClick={handleAddTripleSubmit}
              disabled={!addPred.trim() || !addObject.trim()}
              style={{
                padding: "5px 14px",
                background: !addPred.trim() || !addObject.trim() ? "#9ca3af" : "#0369a1",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: !addPred.trim() || !addObject.trim() ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Add
            </button>
            <button
              onClick={() => setAddingFrom(null)}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
            >
              Cancel
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "8px 0 0" }}>
            Predicates shown are those valid for <strong>?{addingFrom}</strong>'s type in the KG schema.
            The new triple will be appended to your custom SPARQL.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = { marginBottom: 20 };

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  color: "#374151",
};

const hintStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  margin: "4px 0 8px",
};

const codeStyle: React.CSSProperties = {
  background: "#f3f4f6",
  padding: "1px 4px",
  borderRadius: 3,
};

const clearBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1d4ed8",
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};

const addTripleFormStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "14px 16px",
  background: "#f0f9ff",
  border: "1.5px solid #7dd3fc",
  borderRadius: 8,
};

const addInputStyle: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid #7dd3fc",
  borderRadius: 5,
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
  background: "#fff",
};
