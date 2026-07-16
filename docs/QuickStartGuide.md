# Quick Start Guide – MGnify JBrowse

Quick reference for developers working on the mgnify-jbrowse repository (clone, build, modify).

> **Using the package from npm?** See [USAGE.md](./USAGE.md) for install instructions, examples, and extension ideas.

---

## 1. Setup (5 min)

```bash
# Clone and install
git clone <repo-url>
cd mgnify-jbrowse
npm install

# Copy env template and edit with your data URLs
cp .env.example .env.local

# Start dev server
npm start
```

App runs at `http://localhost:5173`. The demo uses GeneViewer with URLs from `.env.local`.

**Quick start with sample data:** Sample FASTA, GFF, and essentiality files are in `public/sample-data/`. Uncomment the sample-data section in `.env.example` and copy to `.env.local`. FASTA and GFF must be BGZF-compressed; see [public/sample-data/README.md](../public/sample-data/README.md).

---

## 2. Project structure

```
src/
├── lib/index.ts              # Public API – exports GeneViewer, JBrowseContigViewer
├── JBrowseContigViewer/      # Contig-level genome browser
│   ├── JBrowseContigViewer.tsx
│   ├── assembly.ts
│   ├── defaultSessionConfig.ts
│   ├── tracks.ts
│   └── types.ts
├── components/GeneViewer/    # Main gene viewer
│   ├── GeneViewer.tsx        # Entry component
│   ├── components/           # UI: Legends, FeaturePanel, GenesInViewTable
│   ├── hooks/                # 10 hooks (init, zoom, selection, click, etc.)
│   ├── utils/                # featureAttrUtils, parseUtils
│   ├── jbrowse/              # config, plugin, Gff3TabixWithEssentialityAdapter
│   ├── essentiality.ts
│   ├── gff.ts
│   └── constants.ts
├── App.tsx                   # Demo app
└── index.tsx
```

---

## 3. Common tasks

### Where to change things

| Task                                | File(s)                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Add UI to the feature panel         | `components/GeneViewer/components/FeaturePanel.tsx`                       |
| Change genes-in-view table          | `components/GeneViewer/components/GenesInViewTable.tsx`                   |
| Change legend / essentiality toggle | `components/GeneViewer/components/GeneViewerLegends.tsx`                  |
| Change track colors / JEXL          | `components/GeneViewer/jbrowse/plugin.ts`                                 |
| Change assembly/track config        | `components/GeneViewer/jbrowse/config.ts`                                 |
| Modify GFF query                    | `components/GeneViewer/gff.ts`                                            |
| Change essentiality colors/icons    | `components/GeneViewer/essentiality.ts`                                   |
| Add new props to GeneViewer         | `components/GeneViewer/types.ts`, `GeneViewer.tsx`                        |
| Change contig viewer config         | `JBrowseContigViewer/assembly.ts`, `tracks.ts`, `defaultSessionConfig.ts` |

### Add a new GeneViewer prop

1. Add type in `components/GeneViewer/types.ts` (`GeneViewerProps`).
2. Use in `GeneViewer.tsx` (destructure from `props`).
3. Optionally export from `components/GeneViewer/index.ts` if consumers need it.

### Add a new hook

1. Create `components/GeneViewer/hooks/useGeneViewer*.ts`.
2. Call it from `GeneViewer.tsx` with the right dependencies.

### Change selection highlight color

- `components/GeneViewer/constants.ts` → `COLORS.highlight`
- Or pass `highlightColor` via JEXL context (plugin sets it from `COLORS.highlight` by default).

---

## 4. Key concepts

### Selection flow

1. **Table click** → `onSelect(locusTag)` → `setSelectedGeneId` → `window.selectedGeneId` + JEXL context
2. **JBrowse click** → `useGeneViewerClickHandler` extracts locus from feature → `setSelectedGeneId`
3. **Session poll** → `useGeneViewerSessionSync` reads `session.selection` every 300ms → `setSelectedGeneId` (skipped for 2s after table click)

### Why `window.selectedGeneId`?

JBrowse JEXL runs in its own render cycle. React state may not be ready when JEXL evaluates `getGeneColor(feature)`. Mirroring `selectedGeneId` to `window.selectedGeneId` ensures the plugin always sees the latest selection (same pattern as METT).

### Essentiality

- CSV loaded by `useGeneViewerEssentiality`.
- Index: `Map<locus_tag, status>`.
- Plugin `getGeneColor` uses `essentialityIndex` and `essentialityColorMap` for non-selected genes.
- Selected gene is always blue (`COLORS.highlight`).

---

## 5. Scripts

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `npm start`         | Start Vite dev server (port 5173) |
| `npm run build`     | Build library → `dist/`           |
| `npm run build:app` | Build demo app → `build/`         |
| `npm run preview`   | Preview built app                 |
| `npm test`          | Run Jest tests                    |

---

## 6. Demo checklist

Before demoing, verify:

- [ ] Selection from **table** updates panel and blue bar in JBrowse
- [ ] Selection from **JBrowse** (click gene) updates panel and table row
- [ ] Table click centers the gene in view
- [ ] Essentiality (if enabled) colors genes; selected gene is blue
- [ ] No missing env vars – check console for errors

---

## 7. Troubleshooting

| Issue                    | Check                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Blue bar not showing     | `window.selectedGeneId` in console; track config has `color1: 'jexl:getGeneColor(feature)'`                                                |
| CORS / 404 on GFF/FASTA  | URLs must be reachable from browser; use absolute URLs or same-origin. See [USAGE.md](./USAGE.md#8-troubleshooting) for consumer-side tips |
| Essentiality not loading | CSV URL; `csvJoinColumn` / `csvStatusColumn` match CSV headers                                                                             |
| Build fails              | `npm run build`; check `tsconfig.lib.json` includes `src/lib`                                                                              |

---

## 8. Links

- [USAGE.md](./USAGE.md) – User guide for installing from npm
- [ARCHITECTURE.md](./ARCHITECTURE.md) – Full architecture and data flow
- [README.md](../README.md) – Usage, API, indexes
