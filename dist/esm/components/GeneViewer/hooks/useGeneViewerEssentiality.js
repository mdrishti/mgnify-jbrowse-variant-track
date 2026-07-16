import { useEffect, useState } from "react";
import { buildEssentialityIndexFromCsv } from "../essentiality";
export function useGeneViewerEssentiality(opts) {
  const [index, setIndex] = useState(new Map());
  const [error, setError] = useState(null);
  useEffect(() => {
    setError(null);
  }, [opts.csvUrl]);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      var _a, _b, _c;
      try {
        if (!opts.enabled || !opts.csvUrl) {
          if (!cancelled) setIndex(new Map());
          return;
        }
        const res = await fetch(opts.csvUrl);
        if (!res.ok)
          throw new Error(
            `Failed to fetch essentiality CSV: ${res.status} ${res.statusText}`,
          );
        const text = await res.text();
        const idx = buildEssentialityIndexFromCsv(text, {
          joinColumn:
            (_a = opts.csvJoinColumn) !== null && _a !== void 0
              ? _a
              : "locus_tag",
          statusColumn:
            (_b = opts.csvStatusColumn) !== null && _b !== void 0
              ? _b
              : "essentiality",
        });
        const statusMap = new Map();
        idx.forEach((row, key) => statusMap.set(key, row.status));
        if (!cancelled) setIndex(statusMap);
      } catch (e) {
        if (!cancelled)
          setError(
            (_c = e === null || e === void 0 ? void 0 : e.message) !== null &&
              _c !== void 0
              ? _c
              : String(e),
          );
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [opts.enabled, opts.csvUrl, opts.csvJoinColumn, opts.csvStatusColumn]);
  return { essentialityIndex: index, essentialityError: error };
}
