/**
 * MVIKGQueryGraph — interactive node-link diagram of a SPARQL template's
 * triple patterns, rendered next to MVIKGQueryBuilder so the user can see
 * how the query is shaped before running it.
 *
 * Each template declares its triples once (see `QUERY_GRAPHS` below) using
 * the same variable names as the corresponding `build()` function in
 * MVIKGQueryBuilder.tsx. This component turns that declarative list into
 * an SVG graph with:
 *  - automatic layered layout (BFS distance from the root variable)
 *  - solid edges for required triples, dashed for OPTIONAL blocks
 *  - bound/unbound coloring: nodes filled once the user supplies a value
 *  - click-to-highlight: clicking a node highlights every edge/triple that
 *    touches it (and dims the rest), so users can isolate one part of the
 *    query visually
 *  - hover tooltips showing the full predicate URI
 */

import React, { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphTriple {
  subject: string;     // SPARQL variable name, no leading "?", e.g. "article"
  predicate: string;    // prefixed predicate, e.g. "dcterms:references"
  object: string;       // variable name, or a literal/bound placeholder (see kind)
  optional?: boolean;   // true if inside an OPTIONAL block
  /** Marks the object as the value the user fills in via the left panel. */
  bindsTo?: "organism" | "gene";
}

export interface QueryGraphSpec {
  templateId: string;
  /** Variable to root the layout on (usually the SELECT's first variable). */
  root: string;
  triples: GraphTriple[];
}

// ---------------------------------------------------------------------------
// Declarative triple lists — one per template, mirroring MVIKGQueryBuilder's
// TEMPLATES[].build() WHERE clauses. Keep these in sync if the SPARQL changes.
// ---------------------------------------------------------------------------

const SHARED_ARTICLE_STRAIN_TRIPLES: GraphTriple[] = [
  { subject: "article", predicate: "a", object: "dcmitype:Text" },
  { subject: "article", predicate: "dcterms:references", object: "section" },
  { subject: "section", predicate: "dcterms:source", object: "sourceFrom" },
  { subject: "section", predicate: "rdf:type", object: "sectionType" },
  { subject: "organism", predicate: "dcterms:source", object: "section" },
  { subject: "organism", predicate: "biolink:in_taxon", object: "taxon" },
  { subject: "strain", predicate: "a", object: "sosa:Sample" },
  { subject: "strain", predicate: "sosa:isSampleOf", object: "organism" },
  { subject: "strain", predicate: "rdfs:label", object: "taxonLabel" },
  { subject: "strain", predicate: "sosa:hasFeatureOfInterest", object: "geneNode" },
  { subject: "geneNode", predicate: "biolink:has_sequence_variant", object: "variant" },
  { subject: "variant", predicate: "rdfs:label", object: "variantLabel" },
  { subject: "strain", predicate: "dcterms:identifier", object: "accession", optional: true },
];

export const QUERY_GRAPHS: QueryGraphSpec[] = [
  {
    templateId: "variants_by_organism_gene",
    root: "article",
    triples: [
      ...SHARED_ARTICLE_STRAIN_TRIPLES,
      { subject: "taxonLabel", predicate: "VALUES", object: "organism input", bindsTo: "organism" },
      { subject: "geneNode", predicate: "dcterms:identifier", object: "geneURI", optional: true, bindsTo: "gene" },
    ],
  },
  {
    templateId: "variants_by_organism",
    root: "article",
    triples: [
      ...SHARED_ARTICLE_STRAIN_TRIPLES,
      { subject: "taxonLabel", predicate: "VALUES", object: "organism input", bindsTo: "organism" },
      { subject: "geneNode", predicate: "dcterms:identifier", object: "geneURI", optional: true },
    ],
  },
  {
    templateId: "papers_by_gene",
    root: "article",
    triples: [
      ...SHARED_ARTICLE_STRAIN_TRIPLES,
      { subject: "geneNode", predicate: "dcterms:identifier", object: "geneURI", optional: true, bindsTo: "gene" },
    ],
  },
  {
    templateId: "all_organisms",
    root: "sample",
    triples: [
      { subject: "sample", predicate: "biolink:in_taxon", object: "taxon" },
      { subject: "taxon", predicate: "rdfs:label", object: "taxonLabel", optional: true },
    ],
  },
  {
    templateId: "genes_cooccurring",
    root: "sample",
    triples: [
      { subject: "sample", predicate: "biolink:in_taxon", object: "taxon", bindsTo: "organism" },
      { subject: "geneAnn", predicate: "rdf:type", object: "biolink:Gene" },
      { subject: "geneAnn", predicate: "rdfs:label", object: "geneLabel" },
      { subject: "section", predicate: "dcterms:hasPart", object: "geneAnn" },
      { subject: "doc", predicate: "dcterms:hasPart", object: "section" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Layout: BFS layering from the root variable, simple left-to-right tree.
// ---------------------------------------------------------------------------

interface LayoutNode {
  id: string;
  isLiteralOrClass: boolean; // "a sosa:Sample" style object that isn't a real ?var
  layer: number;
  x: number;
  y: number;
}

const NODE_W = 132;
const NODE_H = 40;
const LAYER_GAP_X = 190;
const ROW_GAP_Y = 64;

function isVariableNode(name: string): boolean {
  // Crude heuristic: anything containing ":" or a space, or literal class names,
  // is not a real SPARQL variable (it's a class/keyword/placeholder label).
  return !name.includes(":") && !name.includes(" ");
}

function layoutGraph(spec: QueryGraphSpec) {
  const nodeIds = new Set<string>();
  for (const t of spec.triples) {
    nodeIds.add(t.subject);
    nodeIds.add(t.object);
  }

  // BFS layers from root, following subject->object edges (undirected for layering).
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const t of spec.triples) {
    adjacency.get(t.subject)!.push(t.object);
    adjacency.get(t.object)!.push(t.subject);
  }

  const layer = new Map<string, number>();
  layer.set(spec.root, 0);
  const queue = [spec.root];
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
  // Any disconnected nodes (shouldn't normally happen) go to the last layer + 1.
  const maxLayer = Math.max(0, ...Array.from(layer.values()));
  for (const id of nodeIds) {
    if (!layer.has(id)) layer.set(id, maxLayer + 1);
  }

  // Group by layer, assign y by index within layer.
  const byLayer = new Map<number, string[]>();
  for (const id of nodeIds) {
    const l = layer.get(id)!;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }

  const nodes = new Map<string, LayoutNode>();
  let maxRows = 0;
  for (const [l, ids] of byLayer) {
    ids.sort(); // stable order
    maxRows = Math.max(maxRows, ids.length);
    ids.forEach((id, i) => {
      nodes.set(id, {
        id,
        isLiteralOrClass: !isVariableNode(id) || id === spec.root && false,
        layer: l,
        x: l * LAYER_GAP_X + 80,
        y: i * ROW_GAP_Y + 50,
      });
    });
  }

  const width = (maxLayer + 1) * LAYER_GAP_X + NODE_W + 40;
  const height = maxRows * ROW_GAP_Y + 40;

  return { nodes, width: Math.max(width, 420), height: Math.max(height, 220) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MVIKGQueryGraphProps {
  templateId: string;
  organism: string;
  geneUri: string;
}

export default function MVIKGQueryGraph({ templateId, organism, geneUri }: MVIKGQueryGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const spec = useMemo(
    () => QUERY_GRAPHS.find((g) => g.templateId === templateId) ?? QUERY_GRAPHS[0],
    [templateId]
  );
  const { nodes, width, height } = useMemo(() => layoutGraph(spec), [spec]);

  const activeId = selected ?? hovered;

  const isTripleActive = (t: GraphTriple) =>
    activeId === null || t.subject === activeId || t.object === activeId;

  const isNodeActive = (id: string) =>
    activeId === null ||
    id === activeId ||
    spec.triples.some(
      (t) => (t.subject === activeId && t.object === id) || (t.object === activeId && t.subject === id)
    );

  const isBound = (id: string) => {
    const t = spec.triples.find((tr) => tr.object === id && tr.bindsTo);
    if (!t) return false;
    if (t.bindsTo === "organism") return organism.trim().length > 0;
    if (t.bindsTo === "gene") return geneUri.trim().length > 0;
    return false;
  };

  const handleNodeClick = (id: string) => {
    setSelected((cur) => (cur === id ? null : id));
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <label style={labelStyle}>Query graph</label>
        {selected && (
          <button onClick={() => setSelected(null)} style={clearBtnStyle}>
            Clear selection
          </button>
        )}
      </div>
      <p style={hintStyle}>
        Click a node to trace which triple patterns touch it. Dashed lines are{" "}
        <code style={codeStyle}>OPTIONAL</code>. Filled nodes have a value you've entered.
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
          {spec.triples.map((t, i) => {
            const a = nodes.get(t.subject)!;
            const b = nodes.get(t.object)!;
            const active = isTripleActive(t);
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            return (
              <g key={i} opacity={active ? 1 : 0.25}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
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
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={active && activeId ? "#1d4ed8" : "#6b7280"}
                  style={{ pointerEvents: "none", fontFamily: "monospace" }}
                >
                  {t.predicate}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {Array.from(nodes.values()).map((n) => {
            const active = isNodeActive(n.id);
            const bound = isBound(n.id);
            const isVar = isVariableNode(n.id);
            const isSelected = selected === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                opacity={active ? 1 : 0.3}
                onClick={() => handleNodeClick(n.id)}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={isVar ? 8 : 4}
                  fill={bound ? "#dbeafe" : isVar ? "#fff" : "#f3f4f6"}
                  stroke={isSelected ? "#1d4ed8" : bound ? "#60a5fa" : "#d1d5db"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
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
                </text>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  marginBottom: 20,
};

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
