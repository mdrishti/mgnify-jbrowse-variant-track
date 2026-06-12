/**
 * MVIKGViewer — URL-parameter-driven wrapper for MVIKG QLever deep links.
 *
 * QLever SPARQL results include a hyperlink constructed by a BIND clause:
 *
 *   BIND(IRI(CONCAT(
 *     "http://localhost:5173/mvikg",
 *     "?taxon=NCBITaxon_", ?taxonId,
 *     "&accession=", STR(?accession),
 *     "&label=", ENCODE_FOR_URI(STR(?strainLabel))
 *   )) AS ?jbrowseUrl)
 *
 * The component auto-detects whether a GFF annotation file exists for the
 * taxon and renders accordingly:
 *
 *   GFF present  → GeneViewer  (gene annotations + variant track + feature panel)
 *   GFF absent   → VariantOnlyViewer (FASTA reference + variant track only)
 *
 * Expected files under VITE_MVIKG_DATA_BASE_URL/<taxon>/:
 *   <taxon>.fa.gz          bgzip-compressed reference FASTA      (required)
 *   <taxon>.fa.gz.fai      samtools fai index                    (required)
 *   <taxon>.fa.gz.gzi      bgzip index                           (required)
 *   <taxon>.vcf.gz         bgzip-compressed VCF                  (required)
 *   <taxon>.vcf.gz.tbi     tabix index                           (required)
 *   <taxon>.gff.gz         bgzip-compressed GFF3 annotation      (optional)
 *   <taxon>.gff.gz.csi     CSI index                             (optional, needed with GFF)
 */

import "@fontsource/roboto";
import React, { useEffect, useState } from "react";
import { createViewState, JBrowseApp } from "@jbrowse/react-app2";
import { GeneViewer } from "./components/GeneViewer";

// Base URL where per-taxon data directories are served.
// Override with VITE_MVIKG_DATA_BASE_URL in your .env.local.
const DATA_BASE_URL =
  (import.meta.env.VITE_MVIKG_DATA_BASE_URL as string) || "/mvikg-data";

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function getParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

function parseLocation(
  location: string
): { refName: string; start: number; end: number } | null {
  // Accepts "NC_004663.1:1..500000" or "NC_004663.1:1-500000"
  const m = location.match(/^([^:]+):(\d+)\s*(?:\.\.|-)\s*(\d+)$/);
  if (!m) return null;
  return { refName: m[1], start: Number(m[2]), end: Number(m[3]) };
}

// ---------------------------------------------------------------------------
// GFF availability check
// ---------------------------------------------------------------------------

async function checkGffExists(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Variant-only viewer (no GFF required)
// Builds a minimal JBrowse LinearGenomeView with FASTA + VariantTrack.
// ---------------------------------------------------------------------------

interface VariantOnlyViewerProps {
  taxon: string;
  accession: string;
  fastaUrl: string;
  faiUrl: string;
  gziUrl: string;
  vcfUrl: string;
  tbiUrl: string;
  location: string;
  displayName: string;
}

function VariantOnlyViewer({
  taxon,
  accession,
  fastaUrl,
  faiUrl,
  gziUrl,
  vcfUrl,
  tbiUrl,
  location,
  displayName,
}: VariantOnlyViewerProps) {
  const [viewState, setViewState] = useState<ReturnType<
    typeof createViewState
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseLocation(location);
    const refName = parsed?.refName ?? accession;
    const start = parsed?.start ?? 0;
    const end = parsed?.end ?? 500_000;

    try {
      const state = createViewState({
        assembly: {
          name: taxon,
          sequence: {
            type: "ReferenceSequenceTrack",
            trackId: "ReferenceSequenceTrack",
            adapter: {
              type: "BgzipFastaAdapter",
              fastaLocation: { uri: fastaUrl },
              faiLocation: { uri: faiUrl },
              gziLocation: { uri: gziUrl },
            },
          },
        },
        tracks: [
          {
            type: "VariantTrack",
            trackId: "variants",
            name: `${displayName} variants`,
            assemblyNames: [taxon],
            adapter: {
              type: "VcfTabixAdapter",
              vcfGzLocation: { uri: vcfUrl },
              index: {
                indexType: "TBI",
                location: { uri: tbiUrl },
              },
            },
            displays: [
              {
                displayId: "variants-LinearVariantDisplay",
                type: "LinearVariantDisplay",
                height: 200,
              },
            ],
          },
        ],
        defaultSession: {
          name: "MVIKG session",
          views: [
            {
              type: "LinearGenomeView",
              displayedRegions: [
                { refName, start, end, assemblyName: taxon },
              ],
              tracks: [
                {
                  type: "ReferenceSequenceTrack",
                  configuration: "ReferenceSequenceTrack",
                  displays: [
                    {
                      id: "ReferenceSequenceTrack",
                      type: "LinearReferenceSequenceDisplay",
                      height: 100,
                    },
                  ],
                },
                {
                  id: "variants",
                  type: "VariantTrack",
                  configuration: "variants",
                  displays: [
                    {
                      displayId: "variants-LinearVariantDisplay",
                      type: "LinearVariantDisplay",
                      height: 200,
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      setViewState(state);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, [taxon, accession, fastaUrl, faiUrl, gziUrl, vcfUrl, tbiUrl, location]);

  if (error) {
    return (
      <p style={{ color: "red", padding: 16 }}>
        Failed to initialise JBrowse: {error}
      </p>
    );
  }
  if (!viewState) {
    return <p style={{ padding: 16 }}>Loading viewer…</p>;
  }

  return (
    <div style={{ height: 500 }}>
      <JBrowseApp viewState={viewState} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Mode = "loading" | "full" | "variant-only" | "error";

export default function MVIKGViewer() {
  const params = new URLSearchParams(window.location.search);

  const taxon = getParam(params, "taxon");         // e.g. NCBITaxon_226186
  const accession = getParam(params, "accession"); // e.g. NC_004663.1
  const location = getParam(params, "location");   // e.g. NC_004663.1:1..500000
  const label = getParam(params, "label");

  const [mode, setMode] = useState<Mode>("loading");

  const displayName = label
    ? decodeURIComponent(label)
    : taxon.replace("NCBITaxon_", "Taxon ");

  const base = `${DATA_BASE_URL}/${taxon}`;
  const fastaUrl = `${base}/${taxon}.fa.gz`;
  const faiUrl   = `${base}/${taxon}.fa.gz.fai`;
  const gziUrl   = `${base}/${taxon}.fa.gz.gzi`;
  const vcfUrl   = `${base}/${taxon}.vcf.gz`;
  const tbiUrl   = `${base}/${taxon}.vcf.gz.tbi`;
  const gffUrl   = `${base}/${taxon}.gff.gz`;
  const csiUrl   = `${base}/${taxon}.gff.gz.csi`;

  useEffect(() => {
    if (!taxon || !accession) {
      setMode("error");
      return;
    }
    checkGffExists(gffUrl).then((exists) =>
      setMode(exists ? "full" : "variant-only")
    );
  }, [taxon, accession, gffUrl]);

  // --- Missing params ---
  if (!taxon || !accession) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2>MVIKG Variant Viewer</h2>
        <p>Missing required URL parameters. Expected link format from QLever:</p>
        <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
          {[
            "?taxon=NCBITaxon_226186",
            "&accession=NC_004663.1",
            "&location=NC_004663.1:1..500000  (optional)",
            "&label=B.+thetaiotaomicron       (optional)",
          ].join("\n")}
        </pre>
        <p>Add to your SPARQL query:</p>
        <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
          {[
            "OPTIONAL { ?strain dcterms:identifier ?accession . }",
            'BIND(STRAFTER(STR(?taxon), "NCBITaxon_") AS ?taxonId)',
            "BIND(IRI(CONCAT(",
            '  "http://localhost:5173/mvikg",',
            '  "?taxon=NCBITaxon_", ?taxonId,',
            '  "&accession=", STR(?accession),',
            '  "&label=", ENCODE_FOR_URI(STR(?strainLabel))',
            ")) AS ?jbrowseUrl)",
          ].join("\n")}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{displayName}</h2>
        <small style={{ color: "#6b7280" }}>
          {taxon} · {accession}
          {mode === "full" && " · gene annotations + variants"}
          {mode === "variant-only" && " · variants only (no GFF available)"}
        </small>
      </header>

      {mode === "loading" && <p>Checking data availability…</p>}

      {mode === "full" && (
        <GeneViewer
          assembly={{
            name: taxon,
            displayName,
            fasta: { fastaUrl, faiUrl, gziUrl },
          }}
          annotation={{
            name: "Annotation",
            gff: { gffUrl, csiUrl, gffAdapterMode: "auto" },
          }}
          variants={{ vcfUrl, tbiUrl }}
          ui={{
            showLegends: false,
            showFeaturePanel: true,
            showGenesInViewTable: true,
            genesInViewTypes: ["CDS"],
          }}
          initialLocation={location || undefined}
          heightPx={820}
        />
      )}

      {mode === "variant-only" && (
        <VariantOnlyViewer
          taxon={taxon}
          accession={accession}
          fastaUrl={fastaUrl}
          faiUrl={faiUrl}
          gziUrl={gziUrl}
          vcfUrl={vcfUrl}
          tbiUrl={tbiUrl}
          location={location}
          displayName={displayName}
        />
      )}
    </div>
  );
}
