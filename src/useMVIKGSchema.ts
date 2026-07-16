import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// URI utilities
// ---------------------------------------------------------------------------

const PREFIX_MAP: Record<string, string> = {
  "http://purl.org/dc/terms/": "dcterms:",
  "http://www.w3.org/ns/sosa/": "sosa:",
  "https://w3id.org/biolink/vocab/": "biolink:",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf:",
  "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
  "https://w3id.org/mvikg#": "mvikg:",
  "http://purl.org/dc/dcmitype/": "dcmitype:",
  "http://www.w3.org/2002/07/owl#": "owl:",
  "http://purl.obolibrary.org/obo/": "obo:",
};

export function compactUri(uri: string): string {
  for (const [ns, prefix] of Object.entries(PREFIX_MAP)) {
    if (uri.startsWith(ns)) return prefix + uri.slice(ns.length);
  }
  return uri.split(/[/#]/).filter(Boolean).pop() ?? uri;
}

export function shortName(uri: string): string {
  return uri.split(/[/#]/).filter(Boolean).pop() ?? uri;
}

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface SchemaEntry {
  subjectTypeShort: string; // last URI segment, e.g. "Sample"
  predicate: string; // compact form, e.g. "sosa:isSampleOf"
  objectTypeShort: string | null;
}

// ---------------------------------------------------------------------------
// SPARQL introspection query
// ---------------------------------------------------------------------------

const SCHEMA_QUERY = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?subjectType ?pred ?objectType WHERE {
  ?s a ?subjectType .
  ?s ?pred ?o .
  OPTIONAL { ?o a ?objectType . }
  FILTER(?pred != rdf:type)
}
LIMIT 1000`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMVIKGSchema(endpoint: string): {
  schema: SchemaEntry[];
  loading: boolean;
  error: string | null;
  allPredicates: string[];
} {
  const [schema, setSchema] = useState<SchemaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    setLoading(true);
    const params = new URLSearchParams({
      query: SCHEMA_QUERY,
      action: "sparql_json",
    });
    fetch(`${endpoint}/sparql?${params}`, {
      headers: { Accept: "application/sparql-results+json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Schema fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const entries: SchemaEntry[] = (data.results?.bindings ?? []).map(
          (b: any) => ({
            subjectTypeShort: shortName(b.subjectType?.value ?? ""),
            predicate: compactUri(b.pred?.value ?? ""),
            objectTypeShort: b.objectType
              ? shortName(b.objectType.value)
              : null,
          }),
        );
        setSchema(entries);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const allPredicates = [...new Set(schema.map((e) => e.predicate))].sort();

  return { schema, loading, error, allPredicates };
}

// ---------------------------------------------------------------------------
// Helper: filter predicates for a given subject/object type pair
// ---------------------------------------------------------------------------

export function getValidPredicates(
  schema: SchemaEntry[],
  subjectType: string | undefined,
  objectType: string | undefined,
): string[] {
  if (schema.length === 0) return [];
  const filtered = schema.filter(
    (e) =>
      (!subjectType || e.subjectTypeShort === subjectType) &&
      (!objectType ||
        e.objectTypeShort == null ||
        e.objectTypeShort === objectType),
  );
  return [...new Set(filtered.map((e) => e.predicate))].sort();
}
