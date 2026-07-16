# MGnify JBrowse – Architecture Overview

This document describes the architecture of the MGnify JBrowse component library, including the GeneViewer (standalone gene viewer with essentiality) and JBrowseContigViewer (contig-level genome browser).

---

## Prerequisites & data preparation tools

To prepare assembly and annotation data for the GeneViewer or JBrowseContigViewer, you need these tools. Install them via your package manager (e.g. `brew install samtools tabix` on macOS).

| Tool         | Purpose                                          | Output                      |
| ------------ | ------------------------------------------------ | --------------------------- |
| **bgzip**    | BGZF compression (part of `htslib` / `samtools`) | `.fasta.gz`, `.gff.bgz`     |
| **samtools** | FASTA index for BGZF FASTA                       | `.fai`, `.gzi`              |
| **tabix**    | GFF index for region queries                     | `.csi`                      |
| **jbrowse**  | Optional trix text-search index                  | `.ix`, `.ixx`, `_meta.json` |

### FASTA preparation

```bash
bgzip genome.fasta                    # → genome.fasta.gz
samtools faidx genome.fasta.gz        # → genome.fasta.gz.fai, genome.fasta.gz.gzi
```

### GFF preparation

```bash
bgzip annotations.gff                 # → annotations.gff.bgz
tabix -p gff -C annotations.gff.bgz  # → annotations.gff.bgz.csi
```

### Optional: JBrowse text search (ix/ixx)

**JBrowse command line utility install reference**

```bash
npm install -g @jbrowse/cli
```

For gene-by-name search in the viewer, create trix indexes with the JBrowse CLI:

```bash
jbrowse text-index --file annotations.gff.bgz --exclude none --attributes Name,locus_tag,ID,gene
```

This produces `.ix`, `.ixx`, and `_meta.json`. Provide `ixUrl`, `ixxUrl`, and optionally `metaUrl` in the GFF config to enable search.

---

## Project structure

```
src/
├── lib/                          # Package entry point (exports public API)
│   └── index.ts
├── JBrowseContigViewer/          # Contig-level genome browser
│   ├── index.ts
│   ├── JBrowseContigViewer.tsx
│   ├── assembly.ts
│   ├── defaultSessionConfig.ts
│   ├── tracks.ts
│   └── types.ts                  # GenomeMeta
│
├── components/GeneViewer/        # Standalone gene viewer (essentiality, feature panel)
│   ├── index.ts
│   ├── GeneViewer.tsx
│   ├── types.ts
│   ├── constants.ts
│   ├── essentiality.ts
│   ├── gff.ts
│   ├── components/               # UI sub-components
│   │   ├── GeneViewerLegends.tsx
│   │   ├── FeaturePanel.tsx
│   │   └── GenesInViewTable.tsx
│   ├── hooks/
│   │   ├── useJBrowseVisibleRegion.ts
│   │   ├── useGeneViewerEssentiality.ts
│   │   ├── useGeneViewerSessionSync.ts
│   │   ├── useGeneViewerClickHandler.ts
│   │   ├── useGeneViewerInit.ts
│   │   ├── useGeneViewerZoom.ts
│   │   ├── useGeneViewerTrackRefresh.ts
│   │   ├── useGeneViewerTableNav.ts
│   │   ├── useGeneViewerHideDrawer.ts
│   │   └── useGeneViewerSelection.ts
│   ├── utils/
│   │   ├── featureAttrUtils.ts
│   │   └── parseUtils.ts
│   └── jbrowse/
│       ├── config.ts
│       ├── plugin.ts
│       ├── Gff3TabixWithEssentialityAdapter.ts
│       └── Gff3WithEssentialityAdapter.ts   # Whole-file adapter for small GFFs
│
├── App.tsx                       # Demo app (uses GeneViewer)
└── index.tsx                     # App entry
```

---

## GeneViewer – High-level Organisation

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GeneViewer (React)                                                     │
│  • State: selectedGeneId, genesInView, viewState, essentiality          │
│  • Syncs selection: table ↔ JBrowse ↔ custom panel                      │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                        │
         ▼                    ▼                        ▼
┌───────────────┐   ┌─────────────────────┐   ┌──────────────────────────┐
│ GenesInView   │   │ JBrowse (embed)     │   │ FeaturePanel (custom)    │
│ Table         │   │ • LinearGenomeView  │   │ • Locus, product, type   │
│ • Rows =      │   │ • Feature track     │   │ • Attributes             │
│   genes in    │   │ • JEXL color =      │   │ • Essentiality badge     │
│   viewport    │   │   getGeneColor()    │   │ • No JBrowse drawer      │
└───────────────┘   └─────────────────────┘   └──────────────────────────┘
         │                     │
         │  onSelect(id)       │
         └──────────┬──────────┘
                    ▼
            setSelectedGeneId(id)
                    │
                    ├──► setGeneViewerJexlContext() + window.selectedGeneId
                    ├──► display.reload() + setWidth() to force track repaint
                    └──► selectedFeature → panel + table highlight
```

---

## GeneViewer – Data flow

1. **Assembly + annotation**  
   Props define assembly (FASTA/FAI/GZI) and annotation (GFF/CSI). Config is built in `jbrowse/config.ts` (assembly, tracks, default session).

2. **JBrowse view state**  
   Created once in `GeneViewer` via `createViewState({ config, plugins: [GeneViewerJBrowsePlugin] })`. The plugin registers JEXL functions (`getGeneColor`, `getEssentialityIcon`, etc.) that run inside the track renderer.

3. **Selection**
   - **Table → app:** `GenesInViewTable` calls `onSelect(locusTag)` → `setSelectedGeneId(locusTag)`; optional `view.centerAt()` for table-driven navigation.
   - **JBrowse → app:** A 300ms poll reads `session.selection`, extracts locus_tag/ID (with `extractLocusFromFeature`), and calls `setSelectedGeneId`.
   - **Cooldown:** For 2s after a table click, the poll does not overwrite selection so table choice stays.

4. **Gene highlight (blue bar)**
   - **JEXL:** Track renderer uses `color1: 'jexl:getGeneColor(feature)'`.
   - **Plugin:** `getGeneColor(feature)` compares feature's locus_tag / ID / name to the current selection. Selection is read from a **global fallback** `window.selectedGeneId` first, then `ctx.selectedGeneId`, so JBrowse's JEXL always sees the latest value regardless of React lifecycle.
   - **Context:** `setGeneViewerJexlContext()` is called from `useLayoutEffect` (and also sets `window.selectedGeneId`).
   - **Repaint:** When selection or essentiality changes, `useGeneViewerTrackRefresh` runs `display.reload()` on all track displays and a brief `view.setWidth(w±ε)` to force the view to repaint so the new color is visible.

5. **Genes in view**  
   `useJBrowseVisibleRegion` gets the current visible region from the view (with a cap, e.g. 5Mb). That drives a GFF region query; results are stored in `genesInView` and shown in the table.

---

## GeneViewer – Key files

| Area           | File / path                        | Role                                                                                                       |
| -------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Entry          | `GeneViewer.tsx`                   | State, sync (selection poll, JEXL context, reload), layout (JBrowse \| panel, table below).                |
| UI components  | `components/`                      | GeneViewerLegends, FeaturePanel, GenesInViewTable.                                                         |
| Hooks          | `hooks/`                           | useJBrowseVisibleRegion, useGeneViewerInit, useGeneViewerSelection, useGeneViewerTrackRefresh, etc.        |
| JBrowse config | `jbrowse/config.ts`                | Assembly, tracks (GFF adapter, SvgFeatureRenderer, `color1: jexl:getGeneColor(feature)`), default session. |
| JBrowse plugin | `jbrowse/plugin.ts`                | JEXL: `getGeneColor`, `getEssentialityIcon`, etc. Selection from `window.selectedGeneId` + `ctx`.          |
| Visible region | `hooks/useJBrowseVisibleRegion.ts` | Reads view's displayed region (with cap), used for "genes in view" and GFF query.                          |
| Table          | `components/GenesInViewTable.tsx`  | Renders genes in view; `onSelect(locusTag)` for selection.                                                 |
| Panel          | `components/FeaturePanel.tsx`      | Shows selected feature details and attributes (no scroll).                                                 |
| GFF            | `gff.ts`                           | FAI ref, GFF region query, `GffFeature` type.                                                              |
| Essentiality   | `essentiality.ts`                  | CSV index, colors, icons; used in plugin and panel.                                                        |

---

## JBrowseContigViewer

A simpler contig-level genome browser that uses `GenomeMeta` and file locations. Used for MGnify contig viewing workflows.

- **assembly.ts** – Builds assembly config from GenomeMeta + file URLs (fasta, fai, gzi).
- **tracks.ts** – Builds feature track config (GFF3 tabix).
- **defaultSessionConfig.ts** – Session layout (displayed regions, track visibility).
- **types.ts** – `GenomeMeta` interface.

---
