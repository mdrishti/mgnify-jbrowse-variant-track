import "@fontsource/roboto";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createViewState, JBrowseApp } from "@jbrowse/react-app2";
import VariantsPlugin from "@jbrowse/plugin-variants";
import { GeneViewer } from "./components/GeneViewer";
import { VariantOnlyViewer } from "./MVIKGViewer";

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  vcfGz: string | null;
  tbi: string | null;
  fastaGz: string | null;
  fai: string | null;
  gzi: string | null;
}

// ---------------------------------------------------------------------------
// QLever-driven variant viewer — no pre-deployed files needed.
// Queries the KG directly and feeds features into JBrowse via FromConfigAdapter.
// ---------------------------------------------------------------------------

const QLEVER_ENDPOINT =
  (import.meta.env.VITE_QLEVER_ENDPOINT as string) || "http://localhost:7035";

const PREPARE_API =
  (import.meta.env.VITE_PREPARE_API_URL as string) || "http://localhost:8001";

interface KGVariant {
  refName: string;
  start: number;
  end: number;
  svType: string;
  effect: string;
  pmcId: string;
  biome: string;
}

async function fetchVariantsFromKG(strainLabel: string): Promise<KGVariant[]> {
  const query = `
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX sosa:    <http://www.w3.org/ns/sosa/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX mvikg:   <https://w3id.org/mvikg#>

SELECT ?accession ?start ?stop ?svTypeName ?effect ?biome ?pmcId WHERE {
  ?taxon rdfs:label "${strainLabel}" .
  ?taxon dcterms:identifier ?accession .
  ?taxon sosa:hasFeatureOfInterest ?geneNode .
  ?geneNode biolink:has_sequence_variant ?variant .
  OPTIONAL { ?variant biolink:start_coordinate ?start }
  OPTIONAL { ?variant biolink:end_coordinate   ?stop  }
  OPTIONAL { ?variant mvikg:sequenceVariantTypeName ?svTypeName }
  OPTIONAL { ?variant mvikg:effect ?effect }
  OPTIONAL { ?taxon mvikg:has_biome ?biome }
  OPTIONAL {
    ?taxon dcterms:isPartOf ?project .
    ?pmc dcterms:references ?project .
    BIND(REPLACE(STR(?pmc), ".*PMC", "PMC") AS ?pmcId)
  }
}`;

  const params = new URLSearchParams({ query, action: "sparql_json" });
  const resp = await fetch(`${QLEVER_ENDPOINT}/sparql?${params}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!resp.ok) throw new Error(`QLever returned ${resp.status}`);
  const data = await resp.json();

  const g = (row: Record<string, { value: string }>, key: string) =>
    row[key]?.value ?? "";

  const seenIds = new Set<string>();
  const variants: KGVariant[] = [];

  for (const row of data.results.bindings) {
    const refName = g(row, "accession");
    const start = parseInt(g(row, "start"), 10);
    const end = parseInt(g(row, "stop"), 10);
    if (!refName || isNaN(start) || isNaN(end)) continue;
    if (refName.startsWith("http") || refName.includes(" ")) continue;

    const svRaw = g(row, "svTypeName");
    const svType = svRaw.includes("#")
      ? svRaw.split("#").pop()!
      : (svRaw.split("/").pop() ?? svRaw);

    const uid = `${refName}:${start}-${end}:${svType}`;
    if (seenIds.has(uid)) continue;
    seenIds.add(uid);

    variants.push({
      refName,
      start: start - 1, // KG coords are 1-based; JBrowse features are 0-based
      end,
      svType,
      effect: g(row, "effect"),
      pmcId: g(row, "pmcId"),
      biome: g(row, "biome"),
    });
  }
  return variants;
}

function KGVariantViewer({
  organism,
  displayName,
}: {
  organism: string;
  displayName: string;
}) {
  const [viewState, setViewState] = useState<ReturnType<
    typeof createViewState
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Querying knowledge graph…");
  const blobUrlRef = useRef<string | null>(null);

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    fetchVariantsFromKG(displayName)
      .then((variants) => {
        if (variants.length === 0) {
          setError("No variants found in the knowledge graph for this strain.");
          return;
        }
        setStatus(`Building viewer for ${variants.length} variant(s)…`);

        // Virtual chromosome sizes from max end coordinate + buffer
        const chromSizes: Record<string, number> = {};
        for (const v of variants) {
          chromSizes[v.refName] = Math.max(
            chromSizes[v.refName] ?? 0,
            v.end + 10_000,
          );
        }
        const firstChrom = Object.keys(chromSizes)[0];

        const features = variants.map((v, i) => ({
          uniqueId: `v${i}`,
          refName: v.refName,
          start: v.start,
          end: v.end,
          name: v.svType || "variant",
          type: v.svType || "sequence_variant",
          svType: v.svType,
          effect: v.effect,
          pmcId: v.pmcId,
          biome: v.biome,
        }));

        // ChromSizesAdapter supports getRegions(); FromConfigAdapter does not.
        // Create a Blob URL from the computed chrom sizes so JBrowse can fetch it.
        const chromSizesText = Object.entries(chromSizes)
          .map(([name, size]) => `${name}\t${size}`)
          .join("\n");
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = URL.createObjectURL(
          new Blob([chromSizesText], { type: "text/plain" }),
        );
        const chromSizesUrl = blobUrlRef.current;

        const state = createViewState({
          plugins: [VariantsPlugin],
          config: {
            assemblies: [
              {
                name: organism,
                displayName,
                sequence: {
                  type: "ReferenceSequenceTrack",
                  trackId: `${organism}-refseq`,
                  adapter: {
                    type: "ChromSizesAdapter",
                    chromSizesLocation: { uri: chromSizesUrl },
                  },
                },
              },
            ],
            tracks: [
              {
                type: "FeatureTrack",
                trackId: `${organism}-kg-variants`,
                name: `${displayName} variants (from KG)`,
                assemblyNames: [organism],
                adapter: {
                  type: "FromConfigAdapter",
                  features,
                },
                displays: [
                  {
                    type: "LinearBasicDisplay",
                    displayId: `${organism}-kg-variants-display`,
                    height: 200,
                    renderer: {
                      type: "SvgFeatureRenderer",
                      color1: "#e11d48",
                    },
                  },
                ],
              },
            ],
            defaultSession: {
              name: "KG session",
              views: [
                {
                  type: "LinearGenomeView",
                  displayedRegions: [
                    {
                      refName: firstChrom,
                      start: 0,
                      end: chromSizes[firstChrom],
                      assemblyName: organism,
                    },
                  ],
                  tracks: [
                    {
                      id: `${organism}-kg-variants`,
                      type: "FeatureTrack",
                      configuration: `${organism}-kg-variants`,
                      displays: [
                        {
                          id: `${organism}-kg-variants-display`,
                          type: "LinearBasicDisplay",
                          height: 200,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        });
        setViewState(state);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, [organism, displayName]);

  if (error) return <p style={{ color: "#991b1b", padding: 16 }}>{error}</p>;
  if (!viewState)
    return <p style={{ padding: 16, color: "#6b7280" }}>{status}</p>;

  return (
    <div>
      <p style={{ fontSize: 12, color: "#92400e", margin: "0 0 8px" }}>
        Showing variants from the knowledge graph (no reference sequence).
        Deploy FASTA files via <code>kg_to_vcf.py --keep-genome</code> for full
        sequence context.
      </p>
      <div style={{ height: 400 }}>
        <JBrowseApp viewState={viewState} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StrainViewer — fetches primary seq name from .fai, loads variants from KG,
// then provides direct navigation (1 variant) or a dropdown (many variants).
// ---------------------------------------------------------------------------

interface ContigVariant {
  start: number;
  end: number;
  svType: string;
  effect: string;
  label: string;
}

async function fetchContigVariants(
  displayName: string,
  accession: string,
): Promise<ContigVariant[]> {
  const query = `
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX sosa:    <http://www.w3.org/ns/sosa/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX mvikg:   <https://w3id.org/mvikg#>

SELECT DISTINCT ?start ?stop ?svTypeName ?effect WHERE {
  ?taxon rdfs:label "${displayName}" .
  ?taxon dcterms:identifier ?contig .
  FILTER(STR(?contig) = "${accession}")
  ?taxon sosa:hasFeatureOfInterest ?geneNode .
  ?geneNode biolink:has_sequence_variant ?variant .
  OPTIONAL { ?variant biolink:start_coordinate ?start }
  OPTIONAL { ?variant biolink:end_coordinate   ?stop  }
  OPTIONAL { ?variant mvikg:sequenceVariantTypeName ?svTypeName }
  OPTIONAL { ?variant mvikg:effect ?effect }
}
ORDER BY ?start`;

  const params = new URLSearchParams({ query, action: "sparql_json" });
  const resp = await fetch(`${QLEVER_ENDPOINT}/sparql?${params}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!resp.ok) return [];
  const data = await resp.json();

  return data.results.bindings
    .map((row: Record<string, { value: string }>) => {
      const start = parseInt(row.start?.value ?? "", 10);
      const end = parseInt(row.stop?.value ?? "", 10);
      if (isNaN(start) || isNaN(end)) return null;
      const svRaw = row.svTypeName?.value ?? "";
      const svType = svRaw.includes("/") ? svRaw.split("/").pop()! : svRaw;
      const effect = row.effect?.value ?? "";
      return {
        start: start - 1, // 1-based → 0-based
        end,
        svType,
        effect,
        label: `${accession}:${start}–${end}${svType ? ` (${svType})` : ""}`,
      };
    })
    .filter(Boolean) as ContigVariant[];
}

function VariantNavigator({
  accession,
  variants,
  viewState,
  initialStart,
}: {
  accession: string;
  variants: ContigVariant[];
  viewState: ReturnType<typeof createViewState> | null;
  initialStart?: number; // 1-based; used to pre-select the clicked variant
}) {
  // Find the variant matching the URL start param (1-based → compare against start+1)
  const initialIdx =
    initialStart !== undefined
      ? Math.max(
          0,
          variants.findIndex((v) => v.start + 1 === initialStart),
        )
      : 0;
  const [selected, setSelected] = useState(initialIdx);

  const navTo = useCallback(
    (idx: number) => {
      const v = variants[idx];
      if (!v || !viewState) return;
      // JBrowse session.views is a MobX array on the session model
      const session = viewState.session as any;
      const view = session?.views?.[0] ?? session?.view;
      if (!view?.navToLocString) return;
      const pad = Math.max(500, Math.round((v.end - v.start) * 2));
      const locString = `${accession}:${Math.max(0, v.start - pad)}..${v.end + pad}`;
      // JBrowse may not be fully rendered yet — retry a few times
      const attempt = (tries: number) => {
        try {
          view.navToLocString(locString);
        } catch {
          if (tries > 0) setTimeout(() => attempt(tries - 1), 600);
        }
      };
      attempt(5);
    },
    [accession, variants, viewState],
  );

  // When variants load, update selected index to match the URL-specified start position
  useEffect(() => {
    if (variants.length === 0) return;
    if (initialStart !== undefined) {
      const idx = variants.findIndex((v) => v.start + 1 === initialStart);
      if (idx >= 0) setSelected(idx);
    }
  }, [variants, initialStart]);

  // Auto-navigate when BOTH viewState AND variants are ready (whichever arrives last)
  useEffect(() => {
    if (viewState && variants.length > 0) navTo(selected);
  }, [viewState, variants]); // eslint-disable-line react-hooks/exhaustive-deps

  if (variants.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: 8,
        marginBottom: 10,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 600, color: "#0369a1" }}>
        {variants.length === 1 ? "1 variant" : `${variants.length} variants`}
      </span>
      {variants.length === 1 ? (
        <>
          <span style={{ color: "#374151" }}>{variants[0].label}</span>
          <button
            onClick={() => navTo(0)}
            style={{
              padding: "3px 10px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Go to variant
          </button>
        </>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setSelected(idx);
              navTo(idx);
            }}
            style={{
              padding: "3px 8px",
              borderRadius: 5,
              border: "1px solid #93c5fd",
              fontSize: 12,
              maxWidth: 420,
            }}
          >
            {variants.map((v, i) => (
              <option key={i} value={i}>
                {v.label}
                {v.effect ? ` — ${v.effect}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => navTo(selected)}
            style={{
              padding: "3px 10px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Go
          </button>
        </>
      )}
    </div>
  );
}

function StrainViewer({
  organism,
  entry,
  displayName,
  initialAccession,
  initialStart,
  initialEnd,
}: {
  organism: string;
  entry: ManifestEntry;
  displayName: string;
  initialAccession?: string;
  initialStart?: number;
  initialEnd?: number;
}) {
  const [primarySeq, setPrimarySeq] = useState<string>(initialAccession ?? "");
  const [variants, setVariants] = useState<ContigVariant[]>([]);
  const [viewState, setViewState] = useState<ReturnType<
    typeof createViewState
  > | null>(null);

  // Resolve primary sequence name from .fai if no accession provided
  useEffect(() => {
    if (initialAccession) return;
    if (!entry.fai) return;
    fetch(entry.fai)
      .then((r) => r.text())
      .then((txt) => {
        const seq = txt.split("\n")[0]?.split("\t")[0] ?? "";
        if (seq) setPrimarySeq(seq);
      })
      .catch(() => {});
  }, [entry.fai, initialAccession]);

  // Always fetch all variants for the contig so the dropdown is fully populated.
  useEffect(() => {
    const accession = initialAccession || primarySeq;
    if (!accession) return;
    fetchContigVariants(displayName, accession)
      .then((vs) => {
        console.log(`[StrainViewer] ${accession}: ${vs.length} variant(s)`, vs);
        setVariants(vs);
      })
      .catch((e) => console.warn("[StrainViewer] KG variant fetch failed:", e));
  }, [displayName, initialAccession, primarySeq]);

  const accession = initialAccession || primarySeq || organism;

  // DEBUG: expose viewState on window so it can be inspected in DevTools
  useEffect(() => {
    if (viewState) (window as any)._jbViewState = viewState;
  }, [viewState]);

  return (
    <>
      <VariantNavigator
        accession={accession}
        variants={variants}
        viewState={viewState}
        initialStart={initialStart}
      />
      <VariantOnlyViewer
        taxon={organism}
        accession={accession}
        fastaUrl={entry.fastaGz!}
        faiUrl={entry.fai!}
        gziUrl={entry.gzi!}
        vcfUrl={entry.vcfGz ?? ""}
        tbiUrl={entry.tbi ?? ""}
        location=""
        displayName={displayName}
        onViewStateReady={setViewState}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PreparePanel — calls api_server, polls for progress, then re-checks manifest
// ---------------------------------------------------------------------------

type PrepareStatus =
  | "idle"
  | "pending"
  | "running"
  | "ready"
  | "error"
  | "unavailable";

function PreparePanel({
  organism,
  displayName,
  onReady,
}: {
  organism: string;
  displayName: string;
  onReady: (entry: ManifestEntry) => void;
}) {
  const [status, setStatus] = useState<PrepareStatus>("idle");
  const [message, setMessage] = useState("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkManifestAndNotify = async () => {
    try {
      const r = await fetch("/sample-data/variants/manifest.json");
      if (!r.ok) return false;
      const manifest: Record<string, ManifestEntry> = await r.json();
      const entry = manifest[organism];
      if (entry?.fastaGz && entry?.vcfGz) {
        onReady(entry);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  };

  const startPipeline = async () => {
    setStatus("pending");
    setMessage("Starting pipeline…");
    setLogLines([]);

    // Check if api_server is reachable
    try {
      const health = await fetch(`${PREPARE_API}/api/health`);
      if (!health.ok) throw new Error();
    } catch {
      setStatus("unavailable");
      setMessage(
        "Prepare API not running. Start it with: python api_server.py",
      );
      return;
    }

    // Kick off the job
    await fetch(`${PREPARE_API}/api/prepare/${organism}`, { method: "POST" });

    // Poll for status every 3 s
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${PREPARE_API}/api/prepare/${organism}/status`);
        const data = await r.json();
        setStatus(data.status);
        setMessage(data.message ?? "");
        setLogLines(data.log ?? []);

        if (data.status === "ready") {
          stopPolling();
          await checkManifestAndNotify();
        } else if (data.status === "error") {
          stopPolling();
        }
      } catch {
        stopPolling();
        setStatus("error");
        setMessage("Lost contact with prepare API.");
      }
    }, 3000);
  };

  useEffect(() => () => stopPolling(), []);

  const statusColor: Record<PrepareStatus, string> = {
    idle: "#374151",
    pending: "#92400e",
    running: "#1d4ed8",
    ready: "#065f46",
    error: "#991b1b",
    unavailable: "#991b1b",
  };

  return (
    <div
      style={{
        padding: 16,
        background: "#f9fafb",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
        Reference files for <strong>{displayName}</strong> are not yet deployed
        locally. Clicking below will download the reference genome from NCBI,
        generate the VCF, and deploy everything automatically. This takes 1–5
        minutes per strain.
      </p>

      {status === "idle" && (
        <button
          onClick={startPipeline}
          style={{
            padding: "8px 20px",
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          ⬇ Download &amp; prepare files for {displayName}
        </button>
      )}

      {status !== "idle" && (
        <div style={{ marginTop: 8 }}>
          <p
            style={{
              margin: "0 0 6px",
              fontWeight: 600,
              color: statusColor[status],
            }}
          >
            {status === "pending" && "⏳ Queued…"}
            {status === "running" && "⚙ Running pipeline…"}
            {status === "ready" && "✓ Ready"}
            {status === "error" && "✗ Error"}
            {status === "unavailable" && "✗ API unavailable"}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#374151" }}>
            {message}
          </p>
          {logLines.length > 0 && (
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                background: "#1e1e1e",
                color: "#d4d4d4",
                padding: 10,
                borderRadius: 6,
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              {logLines.join("\n")}
            </pre>
          )}
          {status === "error" && (
            <button
              onClick={() => {
                setStatus("idle");
                setLogLines([]);
              }}
              style={{
                marginTop: 8,
                padding: "6px 14px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#9ca3af" }}>
        While waiting, variant positions from the knowledge graph are shown
        below.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Organism viewer — loaded when ?organism= URL param is present.
// Priority: manifest (full) → trigger pipeline + KG fallback simultaneously
// ---------------------------------------------------------------------------

function OrganismViewer({
  organism,
  initialAccession,
  initialStart,
  initialEnd,
}: {
  organism: string;
  initialAccession?: string;
  initialStart?: number;
  initialEnd?: number;
}) {
  const [entry, setEntry] = useState<ManifestEntry | null>(null);
  const [manifestChecked, setManifestChecked] = useState(false);
  const displayName = organism.replace(/_/g, " ");

  useEffect(() => {
    fetch("/sample-data/variants/manifest.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((manifest: Record<string, ManifestEntry>) => {
        const e = manifest[organism];
        if (e?.fastaGz && e?.vcfGz) setEntry(e);
      })
      .catch(() => {})
      .finally(() => setManifestChecked(true));
  }, [organism]);

  const header = (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <img src="/MGnify-logo.svg" alt="MGnify" style={{ height: 36 }} />
      <h2 style={{ margin: 0, fontSize: 24 }}>{displayName}</h2>
    </header>
  );

  if (!manifestChecked) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {header}

      {/* Full experience once files are ready */}
      {entry ? (
        <StrainViewer
          organism={organism}
          entry={entry}
          displayName={displayName}
          initialAccession={initialAccession}
          initialStart={initialStart}
          initialEnd={initialEnd}
        />
      ) : (
        <>
          {/* Trigger pipeline, show progress */}
          <PreparePanel
            organism={organism}
            displayName={displayName}
            onReady={(e) => setEntry(e)}
          />
          {/* Meanwhile show KG-only view */}
          <div style={{ marginTop: 24 }}>
            <KGVariantViewer organism={organism} displayName={displayName} />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Genus browser — loaded when ?genus= URL param is present.
// Shows a strain dropdown; each strain uses OrganismViewer logic.
// ---------------------------------------------------------------------------

function GenusBrowser({ genus }: { genus: string }) {
  const [manifest, setManifest] = useState<Record<
    string,
    ManifestEntry
  > | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    fetch("/sample-data/variants/manifest.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, ManifestEntry>) => {
        setManifest(m);
        const first = Object.keys(m).find((k) =>
          k.toLowerCase().includes(genus.toLowerCase()),
        );
        if (first) setSelected(first);
      })
      .catch(() => setManifest({}));
  }, [genus]);

  const header = (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <img src="/MGnify-logo.svg" alt="MGnify" style={{ height: 36 }} />
      <h2 style={{ margin: 0, fontSize: 24, textTransform: "capitalize" }}>
        {genus} — variant browser
      </h2>
    </header>
  );

  if (!manifest) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p>Loading…</p>
      </div>
    );
  }

  const matching = Object.keys(manifest).filter((k) =>
    k.toLowerCase().includes(genus.toLowerCase()),
  );

  if (matching.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p style={{ color: "#991b1b" }}>
          No deployed files found for <strong>{genus}</strong>. Run:
        </p>
        <pre
          style={{
            background: "#f3f4f6",
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          {`cd mvikgViz\npython kg_to_vcf.py --filter ${genus.toLowerCase()} --run-makevcf --keep-genome\nbash compress_and_deploy.sh --deploy`}
        </pre>
      </div>
    );
  }

  const entry = selected ? manifest[selected] : null;
  const displayName = selected.replace(/_/g, " ");

  return (
    <div
      style={{
        width: "100%",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {header}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <label style={{ fontWeight: 600, fontSize: 13 }}>Strain:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            padding: "6px 10px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #d1d5db",
            minWidth: 320,
          }}
        >
          {matching.map((k) => (
            <option key={k} value={k}>
              {k.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {matching.length} strain(s) in KG
        </span>
      </div>

      {entry &&
        selected &&
        (entry.fastaGz && entry.fai && entry.gzi && entry.vcfGz ? (
          <StrainViewer
            key={selected}
            organism={selected}
            entry={entry}
            displayName={displayName}
          />
        ) : (
          <KGVariantViewer
            key={selected}
            organism={selected}
            displayName={displayName}
          />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default app — env-var driven (Path A single-organism demo)
// ---------------------------------------------------------------------------

export default function App() {
  const _params = new URLSearchParams(window.location.search);
  const orgParam = _params.get("organism");
  const accessionParam = _params.get("accession") ?? undefined;
  const startParam = _params.get("start")
    ? parseInt(_params.get("start")!, 10)
    : undefined;
  const endParam = _params.get("end")
    ? parseInt(_params.get("end")!, 10)
    : undefined;
  const genusParam = _params.get("genus");
  if (orgParam)
    return (
      <OrganismViewer
        organism={orgParam}
        initialAccession={accessionParam}
        initialStart={startParam}
        initialEnd={endParam}
      />
    );
  if (genusParam) return <GenusBrowser genus={genusParam} />;

  const assemblyName = import.meta.env.VITE_ASSEMBLY_NAME || "assembly";

  const fastaUrl = import.meta.env.VITE_FASTA_GZ_URL || "";
  const faiUrl = import.meta.env.VITE_FASTA_FAI_URL || "";
  const gziUrl = import.meta.env.VITE_FASTA_GZI_URL || "";

  const gffUrl = import.meta.env.VITE_GFF_BGZ_URL || "";
  const csiUrl = import.meta.env.VITE_GFF_CSI_URL || "";
  const ixUrl = import.meta.env.VITE_GFF_IX_URL || undefined;
  const ixxUrl = import.meta.env.VITE_GFF_IXX_URL || undefined;
  const metaUrl = import.meta.env.VITE_GFF_META_URL || undefined;
  const gffAdapterMode =
    (import.meta.env.VITE_GFF_ADAPTER_MODE as "tabix" | "plain" | "auto") ||
    undefined;

  const vcfUrl = import.meta.env.VITE_VCF_GZ_URL || "";
  const vcfTbiUrl = import.meta.env.VITE_VCF_TBI_URL || "";

  const essentialityCsvUrl =
    import.meta.env.VITE_ESSENTIALITY_CSV_URL ||
    "/sample-data/essentiality/essentiality_sample.csv";

  const initialLocation =
    import.meta.env.VITE_INITIAL_LOCATION ||
    (vcfUrl ? "contig_1:1198000..1216000" : undefined);

  const variantDemoVisibleBp = (() => {
    const loc = initialLocation;
    if (!loc) return 35000;
    const m = loc.match(/^[^:]+:(\d+)\s*(?:\.\.|-)\s*(\d+)$/);
    if (!m) return 35000;
    return Math.max(5000, Number(m[2]) - Number(m[1]));
  })();

  const header = (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <img src="/MGnify-logo.svg" alt="MGnify" style={{ height: 36 }} />
      <h2 style={{ margin: 0, fontSize: 30 }}>
        MGnify Gene Viewer (BU sample)
      </h2>
    </header>
  );

  if (!fastaUrl || !faiUrl || !gziUrl || !gffUrl || !csiUrl) {
    return (
      <div
        style={{
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {header}
        <p>
          Copy <code>bu.env.local</code> to <code>.env.local</code> (or set
          variables below).
        </p>
        <pre
          style={{
            background: "#f3f4f6",
            padding: 12,
            borderRadius: 8,
            overflow: "auto",
          }}
        >
          {`VITE_ASSEMBLY_NAME=BU_ATCC8492VPI0062_NT5002.1
VITE_FASTA_GZ_URL=/sample-data/fasta_files/.../BU_ATCC8492VPI0062_NT5002.1.fa.gz
VITE_FASTA_FAI_URL=...
VITE_FASTA_GZI_URL=...
VITE_GFF_BGZ_URL=/sample-data/gff3_files/BU_ATCC8492/BU_ATCC8492_annotations.gff.gz
VITE_GFF_CSI_URL=...
# Optional variant track:
VITE_VCF_GZ_URL=/sample-data/variants/BU_ATCC8492/PMC12222025_variants.vcf.gz
VITE_VCF_TBI_URL=/sample-data/variants/BU_ATCC8492/PMC12222025_variants.vcf.gz.tbi
VITE_INITIAL_LOCATION=contig_1:1198000..1216000`}
        </pre>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {header}
      {vcfUrl ? (
        <p style={{ marginTop: 0, color: "#374151" }}>
          Variant track: PMC12222025 lab-evolution SNPs on <em>B. uniformis</em>{" "}
          (BU_ATCC8492). Demo region centres on the <strong>peg.962</strong>{" "}
          cluster (~9 SNPs in ~2 kb). Scroll left for <strong>peg.902</strong>.
        </p>
      ) : null}
      <GeneViewer
        assembly={{
          name: assemblyName,
          fasta: { fastaUrl, faiUrl, gziUrl },
        }}
        annotation={{
          name: "Structural Annotation",
          gff: { gffUrl, csiUrl, ixUrl, ixxUrl, metaUrl, gffAdapterMode },
        }}
        variants={
          vcfUrl && vcfTbiUrl
            ? {
                name: "PMC12222025 variants",
                vcfUrl,
                tbiUrl: vcfTbiUrl,
              }
            : undefined
        }
        essentiality={{
          enabled: true,
          csvUrl: essentialityCsvUrl,
          csvJoinColumn: "locus_tag",
          csvStatusColumn: "essentiality",
          featureJoinAttribute: "locus_tag",
        }}
        ui={{
          showLegends: true,
          showFeaturePanel: true,
          showGenesInViewTable: true,
          genesInViewTypes: ["CDS"],
        }}
        initialLocation={initialLocation}
        initialVisibleBp={vcfUrl ? variantDemoVisibleBp : undefined}
        heightPx={vcfUrl ? 820 : 720}
      />
    </div>
  );
}
