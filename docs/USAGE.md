# User Guide – Using mgnify-jbrowse from npm

This guide helps you install and use the **mgnify-jbrowse** React components in your own applications. You can drop in the GeneViewer or JBrowseContigViewer, connect them to MGnify data, and extend them for your project.

> **Developing the package?** See [QuickStartGuide.md](./QuickStartGuide.md) for project setup, structure, and contributor tasks.

---

## 1. Install from npm

```bash
npm install mgnify-jbrowse
```

**Peer dependencies:** Your app needs `react`, `react-dom`, and `@jbrowse/sv-core`. npm 7+ installs these automatically when you install `mgnify-jbrowse`. If you see missing-module errors, run: `npm install react react-dom @jbrowse/sv-core`.

---

## 2. Quick start from scratch

A complete starter flow to get a GeneViewer running in a new app.

### Step 1: Create a Vite + React + TypeScript project

```bash
npm create vite@latest my-gene-viewer-app -- --template react-ts
cd my-gene-viewer-app
```

### Step 2: Install dependencies

```bash
npm install
npm install mgnify-jbrowse
```

### Step 3: Replace `src/App.tsx`

Replace the contents with:

```tsx
import { GeneViewer } from "mgnify-jbrowse";
import "@fontsource/roboto";

function App() {
  const assemblyName = import.meta.env.VITE_ASSEMBLY_NAME || "assembly";
  const fastaUrl = import.meta.env.VITE_FASTA_GZ_URL || "";
  const faiUrl = import.meta.env.VITE_FASTA_FAI_URL || "";
  const gziUrl = import.meta.env.VITE_FASTA_GZI_URL || "";
  const gffUrl = import.meta.env.VITE_GFF_BGZ_URL || "";
  const csiUrl = import.meta.env.VITE_GFF_CSI_URL || "";

  if (!fastaUrl || !faiUrl || !gziUrl || !gffUrl || !csiUrl) {
    return (
      <div style={{ padding: 16 }}>
        <p>
          Configure URLs in <code>.env.local</code>. See{" "}
          <code>.env.example</code> for the required variables.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: 16 }}>
      <h1>MGnify Gene Viewer</h1>
      <GeneViewer
        assembly={{
          name: assemblyName,
          fasta: { fastaUrl, faiUrl, gziUrl },
        }}
        annotation={{
          name: "Annotations",
          gff: { gffUrl, csiUrl },
        }}
        ui={{
          showLegends: true,
          showFeaturePanel: true,
          showGenesInViewTable: true,
        }}
        heightPx={600}
      />
    </div>
  );
}

export default App;
```

> **Layout:** Add `html, body, #root { width: 100%; }` to `src/index.css` so the viewer fills the page (the default Vite template can constrain width).

### Step 3b: Create `.env.local`

Create `.env.local` in the project root with your data URLs:

```
VITE_ASSEMBLY_NAME=my-assembly
VITE_FASTA_GZ_URL=https://.../genome.fasta.gz
VITE_FASTA_FAI_URL=https://.../genome.fasta.gz.fai
VITE_FASTA_GZI_URL=https://.../genome.fasta.gz.gzi
VITE_GFF_BGZ_URL=https://.../annotations.gff.bgz
VITE_GFF_CSI_URL=https://.../annotations.gff.bgz.csi
```

### Step 4: Run the app

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The viewer will load MGnify sample data.

### Minimal `package.json` (reference)

The Vite template already includes `react` and `react-dom`. After `npm install mgnify-jbrowse`, your `package.json` will have:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "mgnify-jbrowse": "^0.1.4"
  }
}
```

Peer dependencies (`@jbrowse/sv-core`) are installed automatically by npm 7+.

> **Note:** MGnify API URLs may require the analysis ID and file names for your specific dataset. Check the [MGnify API](https://www.ebi.ac.uk/metagenomics/api/v1/) for your analysis's file endpoints. Index files (`.fai`, `.gzi`, `.csi`) must be available at the same base URL.

---

## 3. Alternative: Create React App

```bash
npx create-react-app my-gene-viewer-app --template typescript
cd my-gene-viewer-app
npm install mgnify-jbrowse
```

Then replace `src/App.tsx` with the same code as in [§2 Step 3](#step-3-replace-srcapptsx) and run `npm start`.

---

## 4. With essentiality coloring

To color genes by essentiality status, add an `essentiality` config and point to a CSV:

```tsx
<GeneViewer
  assembly={
    {
      /* ... */
    }
  }
  annotation={
    {
      /* ... */
    }
  }
  essentiality={{
    enabled: true,
    csvUrl: "https://your-server.com/essentiality.csv",
    csvJoinColumn: "locus_tag",
    csvStatusColumn: "essentiality",
    featureJoinAttribute: "locus_tag",
  }}
  ui={{ showLegends: true, showFeaturePanel: true, showGenesInViewTable: true }}
  heightPx={600}
/>
```

**Essentiality CSV format:**

```csv
species,media,element,locus_tag,essentiality
uniformis,liquid,gene,BU_ATCC8492_00001,essential
uniformis,liquid,gene,BU_ATCC8492_00002,not_essential
```

- `locus_tag` (or your join column) must match the GFF `locus_tag` attribute.
- `essentiality` (or your status column) values: `essential`, `not_essential`, `unclear`, `unknown`.

If you don't have essentiality data, omit the `essentiality` prop; genes will render without status-based coloring.

---

## 5. JBrowseContigViewer

For contig-level genome browsing with MGnify metadata:

```tsx
import { JBrowseContigViewer, type GenomeMeta } from "mgnify-jbrowse";
import "@fontsource/roboto";

function App() {
  const genomeMeta: GenomeMeta = {
    id: 123,
    species: "Bacteroides uniformis",
    isolate_name: "ATCC 8492",
    assembly_name: "ERZ1049444",
    assembly_accession: "GCA_000154465",
    fasta_file: "ERZ1049444_FASTA.fasta.gz",
    gff_file: "ERZ1049444_FASTA_annotations.gff.bgz",
    fasta_url: "https://...",
    gff_url: "https://...",
    type_strain: true,
  };

  return (
    <JBrowseContigViewer
      genomeMeta={genomeMeta}
      fileLocations={{
        fasta:
          "https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00516474/file/ERZ1049444_FASTA.fasta.gz",
        fai: "https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00516474/file/ERZ1049444_FASTA.fasta.gz.fai",
        gzi: "https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00516474/file/ERZ1049444_FASTA.fasta.gz.gzi",
        gff: "https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00516474/file/ERZ1049444_FASTA_annotations.gff.bgz",
        csi: "https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00516474/file/ERZ1049444_FASTA_annotations.gff.bgz.csi",
      }}
    />
  );
}
```

---

## 6. Data requirements

| Asset | Format                        | Index           |
| ----- | ----------------------------- | --------------- |
| FASTA | BGZF-compressed (`.fasta.gz`) | `.fai` + `.gzi` |
| GFF   | BGZF-compressed (`.gff.bgz`)  | `.csi`          |

**Index files:**

- FASTA: `samtools faidx genome.fasta.gz` → `.fai`, `.gzi`
- GFF: `tabix -p gff -C annotations.gff.bgz` → `.csi`

See [Generating indexes](../README.md#generating-indexes) in the main README for details.

---

## 7. Ideas for extension

| Idea                                             | Where to start                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Add custom tooltips on gene hover                | Extend `GeneViewer` or wrap it; use JBrowse session/feature APIs       |
| Integrate with MGnify API for analysis selection | Fetch analysis metadata, build `assembly`/`annotation` config from API |
| Add export (e.g. BED, sequence)                  | Use `@jbrowse/core` session APIs to get selected region                |
| Custom feature panel layout                      | Fork the component or use `FeaturePanel`-style props if exposed        |
| Add track for coverage / BAM                     | Extend `config.ts` or `tracks.ts` in the source; add new track config  |
| Link to external databases (InterPro, Pfam)      | Use GFF attributes in `FeaturePanel` or `GenesInViewTable`             |

---

## 8. Troubleshooting

| Issue                                     | Check                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Blank viewer or CORS errors               | Ensure FASTA/GFF URLs are reachable from the browser; MGnify API URLs are usually CORS-enabled |
| Genes not colored by essentiality         | Verify `csvJoinColumn` and `featureJoinAttribute` match your CSV and GFF                       |
| "Module not found" for `@jbrowse/sv-core` | Install it: `npm install @jbrowse/sv-core`                                                     |
| Build errors with peer deps               | Use `npm install --legacy-peer-deps` if needed                                                 |

---

## 9. Links

- [npm package](https://www.npmjs.com/package/mgnify-jbrowse)
- [GitHub repo](https://github.com/EBI-Metagenomics/mgnify-jbrowse)
- [MGnify API](https://www.ebi.ac.uk/metagenomics/api/v1/)
- [JBrowse docs](https://jbrowse.org/docs/)
