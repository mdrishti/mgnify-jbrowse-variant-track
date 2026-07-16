# Exercises – Learn by doing

Hands-on exercises to understand the mgnify-jbrowse codebase. No boring walkthroughs—change things, break things, fix things.

---

## 1. Change the highlight color (5 min)

**Goal:** See how selection highlighting flows from constants to the viewer.

**Steps:**

1. Open `src/components/GeneViewer/constants.ts`
2. Change `COLORS.highlight` from `'#2563eb'` to `'#ff0000'` (red)
3. Run `npm start` and click a gene in the viewer or table

**What you'll learn:** The selected gene bar and table row use this color. It flows through `plugin.ts` → JEXL → track renderer.

---

## 2. Add a new essentiality status (15 min)

**Goal:** Understand how essentiality colors and icons are wired.

**Steps:**

1. In `src/components/GeneViewer/essentiality.ts`, add a new status to `DEFAULT_ESSENTIALITY_COLOR_MAP`, e.g. `conditional: '#9b59b6'`
2. In `normalizeEssentialityStatus`, add a case for `'conditional'`
3. In `getIconForEssentiality`, add a case: `case 'conditional': return '🔀'`
4. Add a row to `public/sample-data/essentiality/essentiality_sample.csv` with `essentiality=conditional` for one locus_tag
5. Run the app and see your new color/icon

**What you'll learn:** CSV → `buildEssentialityIndexFromCsv` → plugin JEXL → `getGeneColor` → track.

---

## 3. Break the CSV parser (10 min)

**Goal:** Understand `parseCsv` by breaking it.

**Steps:**

1. In `src/components/GeneViewer/essentiality.ts`, find `parseCsv`
2. Temporarily change line 86: `cur += ch` to `cur += ch + ch` (double every character)
3. Run `npm test` — the essentiality tests should fail
4. Revert and run tests again

**What you'll learn:** How the CSV parser handles commas, quotes, and newlines. Tests give you instant feedback.

---

## 4. Write a test for `normalizeEssentialityStatus` (15 min)

**Goal:** Learn the essentiality logic by writing a test.

**Steps:**

1. Open `src/components/GeneViewer/essentiality.test.ts`
2. Add a new test:
   ```ts
   it('normalizes "non-essential" and "non_essential" to not_essential', () => {
     expect(normalizeEssentialityStatus("non-essential")).toBe("not_essential");
     expect(normalizeEssentialityStatus("non_essential")).toBe("not_essential");
   });
   ```
3. Run `npm test`
4. Try a few more: `''`, `'  ESSENTIAL  '`, `'UNKNOWN'`

**What you'll learn:** The function normalizes messy input. Writing tests forces you to read the implementation.

---

## 5. Change the feature panel width (5 min)

**Goal:** See how constants affect layout.

**Steps:**

1. In `constants.ts`, change `FEATURE_PANEL_WIDTH_PX` from `380` to `500`
2. Run the app — the feature panel (right side) should be wider

**What you'll learn:** Layout constants are centralized. Search for `FEATURE_PANEL_WIDTH_PX` to see where it's used.

---

## 6. "Fix" a deliberately broken test (20 min)

**Goal:** Debug by fixing a failing test.

**Steps:**

1. In `essentiality.test.ts`, find the test for `getColorForEssentiality`
2. Change one assertion to expect the wrong color, e.g. `expect(getColorForEssentiality('essential')).toBe('#00ff00')`
3. Run `npm test` — it fails
4. Read `getColorForEssentiality` in `essentiality.ts` and understand why
5. Fix the test (or change the implementation if you prefer)

**What you'll learn:** Tests document expected behavior. Fixing failures teaches you the code.

---

## 7. Add a console.log to the click handler (10 min)

**Goal:** Trace the selection flow.

**Steps:**

1. Open `src/components/GeneViewer/hooks/useGeneViewerClickHandler.ts`
2. Add `console.log('Clicked feature:', feature, 'locus:', locusTag)` where the locus is extracted
3. Run the app, click a gene in the JBrowse track
4. Check the browser console — you'll see the feature object and extracted locus_tag

**What you'll learn:** Click → `useGeneViewerClickHandler` → `setSelectedGeneId` → `window.selectedGeneId` → JEXL. The feature object has GFF attributes.

---

## 8. Change the initial zoom (5 min)

**Goal:** Understand viewport configuration.

**Steps:**

1. In `src/App.tsx`, the `GeneViewer` receives props. Add `initialVisibleBp={5000}` (zoom in) or `initialVisibleBp={100000}` (zoom out)
2. Run the app — the initial view changes

**What you'll learn:** `initialVisibleBp` controls how many base pairs are visible. Smaller = more zoomed in.

---

## 9. Mock a feature and test `extractLocusFromFeature` (20 min)

**Goal:** Understand how locus_tag is extracted from JBrowse features.

**Steps:**

1. Open `src/components/GeneViewer/utils/featureAttrUtils.test.ts`
2. Add a test that mocks a feature with `get('locus_tag')` returning `'BU_00001'`
3. Call `extractLocusFromFeature(mockFeature, 'locus_tag')` and expect `'BU_00001'`
4. Add another: a feature with `locus_tag` in `attributes`, or a parent with the locus

**What you'll learn:** JBrowse features can have attributes in different places. `extractLocusFromFeature` walks the parent chain.

---

## 10. Disable essentiality and see the difference (5 min)

**Goal:** Compare with/without essentiality coloring.

**Steps:**

1. In `src/App.tsx`, set `essentiality: { enabled: false }` or remove the `essentiality` prop
2. Run the app — genes are no longer colored by essentiality status
3. Re-enable and compare

**What you'll learn:** Essentiality is optional. When disabled, the plugin uses a default color.

---

## Running tests

```bash
npm test
```

Run a specific file:

```bash
npm test -- essentiality.test
```

Watch mode (re-run on save):

```bash
npm test -- --watch
```

---

## Next steps

- Read [QuickStartGuide.md](./QuickStartGuide.md) for "where to change things"
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow and key concepts
- Pick an [extension idea](./USAGE.md#7-ideas-for-extension) and build it
