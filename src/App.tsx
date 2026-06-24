import "@fontsource/roboto";
import React, { useEffect, useState } from "react";
import { GeneViewer } from "./components/GeneViewer";

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  vcfGz:   string | null;
  tbi:     string | null;
  fastaGz: string | null;
  fai:     string | null;
  gzi:     string | null;
}

// ---------------------------------------------------------------------------
// Organism viewer — loaded when ?organism= URL param is present
// ---------------------------------------------------------------------------

function OrganismViewer({ organism }: { organism: string }) {
  const [entry, setEntry] = useState<ManifestEntry | "loading" | "not-found">("loading");

  useEffect(() => {
    fetch("/sample-data/variants/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error("manifest not found");
        return r.json();
      })
      .then((manifest: Record<string, ManifestEntry>) => {
        setEntry(manifest[organism] ?? "not-found");
      })
      .catch(() => setEntry("not-found"));
  }, [organism]);

  const displayName = organism.replace(/_/g, " ");

  const header = (
    <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <img src="/MGnify-logo.svg" alt="MGnify" style={{ height: 36 }} />
      <h2 style={{ margin: 0, fontSize: 24 }}>{displayName}</h2>
    </header>
  );

  if (entry === "loading") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p>Loading data…</p>
      </div>
    );
  }

  if (entry === "not-found") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p style={{ color: "#991b1b" }}>
          No visualization files found for <strong>{displayName}</strong>.
          Run <code>compress_and_deploy.sh --deploy</code> in the mvikgViz repo to deploy VCF files.
        </p>
      </div>
    );
  }

  if (!entry.fastaGz || !entry.fai || !entry.gzi) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {header}
        <p style={{ color: "#92400e" }}>
          VCF files are available for <strong>{displayName}</strong> but no reference FASTA has been
          deployed yet. Run <code>makeVCF.py --keep-genome</code> and then bgzip + faidx the FASTA,
          then re-run <code>compress_and_deploy.sh --deploy</code>.
        </p>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          VCF: <code>{entry.vcfGz}</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      {header}
      <GeneViewer
        assembly={{
          name: organism,
          displayName,
          fasta: { fastaUrl: entry.fastaGz, faiUrl: entry.fai, gziUrl: entry.gzi },
        }}
        annotation={undefined}
        variants={
          entry.vcfGz && entry.tbi
            ? { name: `${displayName} variants`, vcfUrl: entry.vcfGz, tbiUrl: entry.tbi }
            : undefined
        }
        ui={{
          showLegends: false,
          showFeaturePanel: true,
          showGenesInViewTable: false,
          genesInViewTypes: ["CDS"],
        }}
        heightPx={720}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default app — env-var driven (Path A single-organism demo)
// ---------------------------------------------------------------------------

export default function App() {
  const orgParam = new URLSearchParams(window.location.search).get("organism");
  if (orgParam) return <OrganismViewer organism={orgParam} />;

  const assemblyName = import.meta.env.VITE_ASSEMBLY_NAME || "assembly";

  const fastaUrl = import.meta.env.VITE_FASTA_GZ_URL || "";
  const faiUrl = import.meta.env.VITE_FASTA_FAI_URL || "";
  const gziUrl = import.meta.env.VITE_FASTA_GZI_URL || "";

  const gffUrl = import.meta.env.VITE_GFF_BGZ_URL || "";
  const csiUrl = import.meta.env.VITE_GFF_CSI_URL || "";
  const ixUrl = import.meta.env.VITE_GFF_IX_URL || undefined;
  const ixxUrl = import.meta.env.VITE_GFF_IXX_URL || undefined;
  const metaUrl = import.meta.env.VITE_GFF_META_URL || undefined;
  const gffAdapterMode = (import.meta.env.VITE_GFF_ADAPTER_MODE as "tabix" | "plain" | "auto") || undefined;

  const vcfUrl = import.meta.env.VITE_VCF_GZ_URL || "";
  const vcfTbiUrl = import.meta.env.VITE_VCF_TBI_URL || "";

  const essentialityCsvUrl =
    import.meta.env.VITE_ESSENTIALITY_CSV_URL || "/sample-data/essentiality/essentiality_sample.csv";

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
    <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <img src="/MGnify-logo.svg" alt="MGnify" style={{ height: 36 }} />
      <h2 style={{ margin: 0, fontSize: 30 }}>MGnify Gene Viewer (BU sample)</h2>
    </header>
  );

  if (!fastaUrl || !faiUrl || !gziUrl || !gffUrl || !csiUrl) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        {header}
        <p>
          Copy <code>bu.env.local</code> to <code>.env.local</code> (or set variables below).
        </p>
        <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, overflow: "auto" }}>
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
    <div style={{ width: "100%", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {header}
      {vcfUrl ? (
        <p style={{ marginTop: 0, color: "#374151" }}>
          Variant track: PMC12222025 lab-evolution SNPs on <em>B. uniformis</em> (BU_ATCC8492).
          Demo region centres on the <strong>peg.962</strong> cluster (~9 SNPs in ~2 kb). Scroll left for <strong>peg.902</strong>.
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
