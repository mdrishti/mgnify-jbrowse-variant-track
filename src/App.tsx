import "@fontsource/roboto";
import React from "react";
import { GeneViewer } from "./components/GeneViewer";

export default function App() {
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

  /** Match parsed region span so zoom shows the full demo window (not a 20 kb default). */
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
