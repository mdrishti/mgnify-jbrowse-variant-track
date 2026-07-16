import { useEffect, useState } from "react";
import { buildEssentialityIndexFromCsv } from "../essentiality";

export function useGeneViewerEssentiality(opts: {
  enabled: boolean;
  csvUrl?: string;
  csvJoinColumn?: string;
  csvStatusColumn?: string;
}) {
  const [index, setIndex] = useState<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [opts.csvUrl]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
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
          joinColumn: opts.csvJoinColumn ?? "locus_tag",
          statusColumn: opts.csvStatusColumn ?? "essentiality",
        });
        const statusMap = new Map<string, any>();
        idx.forEach((row, key) => statusMap.set(key, row.status));
        if (!cancelled) setIndex(statusMap);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [opts.enabled, opts.csvUrl, opts.csvJoinColumn, opts.csvStatusColumn]);

  return { essentialityIndex: index, essentialityError: error };
}
