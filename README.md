<p align="left">
  <img src="public/MGnify-logo.svg" alt="MGnify" width="120" />
</p>

# MGnify JBrowse

A React component library for embedding JBrowse genome viewers in MGnify applications. Exports two main components:

**Production use:** The component is deployed in the [METT Data Portal](https://www.gut-microbes.org/), where researchers explore microbial genomes such as [Bacteroides uniformis (BU_ATCC8492)](http://www.gut-microbes.org/genome/BU_ATCC8492).

- **GeneViewer** – Standalone gene viewer with essentiality coloring, feature panel, and genes-in-view table
- **JBrowseContigViewer** – Contig-level genome browser for MGnify contig viewing workflows

## Install from npm

Use the published package in your React app:

```bash
npm install mgnify-jbrowse
```

**Peer dependencies:** Your app needs `react`, `react-dom`, and `@jbrowse/sv-core`. npm 7+ installs these automatically when you install `mgnify-jbrowse`. If you see missing-module errors, run: `npm install react react-dom @jbrowse/sv-core`.

### Configure and run

1. **Create a React app** (if you don't have one):

   ```bash
   npm create vite@latest my-gene-viewer-app -- --template react-ts
   cd my-gene-viewer-app
   npm install
   npm install mgnify-jbrowse
   ```

2. **Add the component** – Replace `src/App.tsx` with the example below (or add it to your own component).

3. **Create `.env.local`** with your URLs (see [Demo app configuration](#demo-app-configuration)).

4. **Run the app** – `npm run dev` (Vite) or `npm start` (Create React App), then open the URL in your browser.

For a full step-by-step guide with copy-paste examples, see [docs/USAGE.md](docs/USAGE.md#2-quick-start-from-scratch).

### Complete App.tsx example

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

> **Layout tip:** Use `width: '100%'` on the parent div so the viewer fills the page. If using the default Vite template, add `html, body, #root { width: 100%; }` to your CSS to avoid a squeezed layout.

See [docs/USAGE.md](docs/USAGE.md) for essentiality coloring, JBrowseContigViewer, and extension ideas.

---

## Quick start (development)

```bash
npm install
npm start
```

The demo app runs at `http://localhost:5173` and uses the GeneViewer component. Configure URLs via `.env.local` (see [Demo app configuration](#demo-app-configuration)).

---

## MVIKG variant explorer (local)

The MVIKG (Microbial Variant and Interaction Knowledge Graph) variant explorer is a local research tool that queries a QLever SPARQL endpoint, visualises results in an interactive query builder, and links directly into JBrowse for genome-level variant inspection.

### Prerequisites

| Tool                                            | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| [QLever](https://github.com/ad-freiburg/qlever) | SPARQL backend serving the KG (default port 7035) |
| `samtools`, `bgzip`, `tabix`                    | Indexing FASTAs and VCFs (part of htslib)         |
| Python ≥ 3.10                                   | Running the variant pipeline scripts              |

### Running the explorer

**1. Start QLever** (in the directory where the KG index lives)

```bash
qlever start
# Listens on http://localhost:7035 by default
```

**2. Start the JBrowse frontend**

```bash
cd mgnify-jbrowse-variant-track_<date>
npm install       # first time only
npm run dev
# Open http://localhost:5173
```

**3. (Optional) Start the API server** — triggers VCF/FASTA preparation automatically when a user clicks "View in JBrowse" for an organism that has no pre-deployed files

```bash
cd mvikgViz/
python api_server.py
# Listens on http://localhost:8001
```

If QLever runs on a different port, set `VITE_QLEVER_ENDPOINT` in `.env.local`:

```bash
echo "VITE_QLEVER_ENDPOINT=http://localhost:7035" >> .env.local
```

### Using the query page

Open **http://localhost:5173/query** in your browser.

1. **Pick a template** from the left panel:
   - _Variant summary by genus / species (per contig)_ — one row per strain + contig with total variant count
   - _Variant positions by genus / species (per variant)_ — one row per variant with genomic coordinates
   - Other templates for organism-level, gene-level, and paper-level queries

2. **Enter a genus or organism** in the input field (e.g. `Bacteroides`)

3. Click **Build query**, then **▶ Run query**

4. Click **View in JBrowse** on any result row:
   - Blue button — FASTA + VCF already deployed; JBrowse opens immediately
   - Grey button — VCF available in KG only; opens a variant-only view
   - If the API server is running, clicking either button triggers automatic FASTA + VCF preparation for organisms not yet deployed; reload and click again once ready

5. For per-variant queries, JBrowse navigates directly to that variant's coordinates. A dropdown lets you jump to other variants on the same contig.

### Pre-deploying VCFs for all organisms

To batch-generate VCFs from the KG without waiting for on-demand triggers:

```bash
cd mvikgViz/

# Generate VCFs for all organisms (or filter by genus)
python kg_to_vcf_direct.py --endpoint http://localhost:7035 --outdir vcfs/
python kg_to_vcf_direct.py --filter bacteroides --outdir vcfs/

# Compress, index, and update the manifest
bash compress_and_deploy.sh --jbrowse-dir ../mgnify-jbrowse-variant-track_<date> --deploy

# Deploy FASTAs (copies bgzipped FASTAs + indices into public/sample-data/fasta_files/)
python deploy_fastas.py
```

---

## Documentation

| Document                                           | Description                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| [docs/USAGE.md](docs/USAGE.md)                     | **User guide** – Install from npm, examples, extension ideas                  |
| [docs/EXERCISES.md](docs/EXERCISES.md)             | **Learn by doing** – Hands-on exercises and tests                             |
| [docs/DOCKER.md](docs/DOCKER.md)                   | Docker deployment guide                                                       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Architecture overview, project structure, data flow, key files                |
| [docs/QuickStartGuide.md](docs/QuickStartGuide.md) | **Developer guide** – Quick start guide: setup, common tasks, troubleshooting |
| [docs/README.md](docs/README.md)                   | Documentation index                                                           |

---

## Usage

### GeneViewer (standalone component)

GeneViewer provides:

- JBrowse Linear Genome View (assembly + gene track)
- Selected gene highlighting (blue bar)
- Optional essentiality coloring driven by a local CSV (no API/database)
- Feature panel (basic annotations from GFF)
- Synced "genes in view" table (based on current viewport)

```tsx
import { GeneViewer } from "mgnify-jbrowse";

function App() {
  return (
    <GeneViewer
      assembly={{
        name: "my-assembly",
        fasta: { fastaUrl: "...", faiUrl: "...", gziUrl: "..." },
      }}
      annotation={{
        name: "Annotations",
        gff: { gffUrl: "...", csiUrl: "..." },
      }}
      essentiality={{
        enabled: true,
        csvUrl: "/essentiality/essentiality_sample.csv",
        csvJoinColumn: "locus_tag",
        csvStatusColumn: "essentiality",
        featureJoinAttribute: "locus_tag",
      }}
      ui={{
        showLegends: true,
        showFeaturePanel: true,
        showGenesInViewTable: true,
      }}
      heightPx={600}
    />
  );
}
```

### JBrowseContigViewer

```tsx
import { JBrowseContigViewer, type GenomeMeta } from "mgnify-jbrowse";

function App() {
  const genomeMeta: GenomeMeta = {
    /* ... */
  };
  return (
    <JBrowseContigViewer
      genomeMeta={genomeMeta}
      fileLocations={{
        fasta: "https://.../genome.fasta.gz",
        fai: "https://.../genome.fasta.gz.fai",
        gzi: "https://.../genome.fasta.gz.gzi",
        gff: "https://.../annotations.gff.bgz",
        csi: "https://.../annotations.gff.bgz.csi",
      }}
    />
  );
}
```

### Library exports

```ts
import {
  GeneViewer,
  JBrowseContigViewer,
  type GeneViewerProps,
  type JBrowseContigViewerProps,
  type GenomeMeta,
  type GeneViewerAssemblyConfig,
  type GeneViewerAnnotationConfig,
  COLORS,
  DEFAULT_ESSENTIALITY_COLOR_MAP,
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "mgnify-jbrowse";
```

---

## Sample data (quick start)

Sample FASTA, GFF, and essentiality files are in `public/sample-data/` for local testing. **Not included in the npm package** (excluded via `package.json` files and from release tarballs via `.gitattributes`).

- See [public/sample-data/README.md](public/sample-data/README.md) for format requirements and usage.
- The essentiality CSV is ready to use; FASTA and GFF may need conversion to BGZF (see [Generating indexes](#generating-indexes)).

---

## Demo app configuration

The demo app reads URLs from env vars (Vite `VITE_` prefix). See `.env.example`:

```bash
VITE_ASSEMBLY_NAME=your_assembly_name
VITE_FASTA_GZ_URL=https://.../genome.fasta.gz
VITE_FASTA_FAI_URL=https://.../genome.fasta.gz.fai
VITE_FASTA_GZI_URL=https://.../genome.fasta.gz.gzi
VITE_GFF_BGZ_URL=https://.../annotations.gff.bgz
VITE_GFF_CSI_URL=https://.../annotations.gff.bgz.csi

# Optional (defaults to public/sample-data/essentiality/essentiality_sample.csv):
VITE_ESSENTIALITY_CSV_URL=https://.../essentiality.csv
VITE_GFF_IX_URL=https://.../annotations.gff.bgz.ix
VITE_GFF_IXX_URL=https://.../annotations.gff.bgz.ixx
VITE_GFF_META_URL=https://.../annotations.gff.bgz_meta.json
```

---

## Essentiality CSV format

The plugin expects a CSV with columns for locus tag and essentiality status. Example:

```csv
species,media,element,locus_tag,essentiality
uniformis,liquid,gene,BU_ATCC8492_00001,essential
uniformis,solid,gene,BU_ATCC8492_00001,essential
uniformis,liquid,gene,BU_ATCC8492_00002,not_essential
```

Configure `csvJoinColumn` and `csvStatusColumn` to match your CSV headers (defaults: `locus_tag`, `essentiality`).

---

## Small GFF files

JBrowse uses 128 KB chunked range requests for GFF files. For small GFFs (<128 KB), this can cause HTTP 416 (Range Not Satisfiable). Use `gffAdapterMode` to avoid this:

```tsx
annotation={{
  gff: {
    gffUrl,
    csiUrl,
    // gffAdapterMode defaults to 'auto' for automatic detection
    // smallGffThresholdBytes: 256000,  // Use plain adapter if file < this (bytes)
  },
}}
```

- **`auto`** (default): HEAD request to get `Content-Length`; uses `plain` if size < `smallGffThresholdBytes` (256 KB), otherwise `tabix`.
- **`tabix`**: Indexed range requests. Best for large GFFs.
- **`plain`**: Whole-file fetch. Use for small GFFs to avoid 416.

---

## Build & deploy

```bash
# Build library (output to dist/)
npm run build

# Build demo app (output to build/)
npm run build:app

# Preview app build
npm run preview
```

---

## Using as a dependency

**Option A – npm link (local development)**

```bash
# In mgnify-jbrowse repo
npm run build
npm link

# In your app
npm link mgnify-jbrowse
```

**Option B – install from path**

```bash
npm install /path/to/mgnify-jbrowse
```

**Option C – pack and install tarball**

```bash
cd mgnify-jbrowse
npm pack
# Creates mgnify-jbrowse-0.1.3.tgz

# In your app
npm install /path/to/mgnify-jbrowse-0.1.3.tgz
```

**Peer dependencies:** Host app must have `react`, `react-dom`, and `@jbrowse/sv-core` as dependencies (or peer deps).

---

## Generating indexes

### FASTA indexes

```bash
# 1. Decompress (if required)
gunzip -c BU_ATCC8492VPI0062_NT5002.1.fa.gz > BU_ATCC8492VPI0062_NT5002.1.fa

# 2. Recompress as BGZF
bgzip BU_ATCC8492VPI0062_NT5002.1.fasta

# 3. Verify BGZF
file BU_ATCC8492VPI0062_NT5002.1.fasta.gz

# 4. Create FASTA index
samtools faidx BU_ATCC8492VPI0062_NT5002.1.fasta.gz
```

### GFF indexes

```bash
# 1. Decompress (if required)
gunzip -c BU_ATCC8492_annotations.gff.gz > BU_ATCC8492_annotations.gff

# 2. Recompress as BGZF
bgzip BU_ATCC8492_annotations.gff


# 2a. Sort it in case required
gunzip -c BU_ATCC8492_annotations.gff.gz | sort -k1,1 -k4,4n | bgzip -c > BU_ATCC8492_annotations.gff.gz

# 3. CSI index
tabix -p gff -C BU_ATCC8492_annotations.gff.gz

# 4. JBrowse text index (optional, for search)
jbrowse text-index --file BU_ATCC8492_annotations.gff.gz --exclude none --attributes interpro,pfam,eggnog
# jbrowse text-index --file BU_ATCC8492_annotations.gff.gz --exclude none --attributes gene,locus_tag,protein_id

# Generate the metadata file (.gff.gz_meta.json)
# update the localPath and LocationType
```

### Sample FTP URLs

- FASTA: `https://ftp.ebi.ac.uk/pub/databases/mett/all_hd_isolates/deduplicated_assemblies/BU_ATCC8492VPI0062_NT5002.1.fa`
- GFF: `https://ftp.ebi.ac.uk/pub/databases/mett/annotations/v1_2024-04-15/BU_ATCC8492/functional_annotation/merged_gff/BU_ATCC8492_annotations.gff`

---

## Local data server

If using `localhost` URLs for data, run a static server for assets:

```bash
npx serve public -p 3001
```

Then run the app in another terminal: `npm start` (Vite serves on 5173 by default).
