import { useEffect, useState } from "react";
import { fetchGffContentLength } from "../gff";
const DEFAULT_SMALL_GFF_THRESHOLD = 256000;
export function useResolvedGffAdapterMode(
  gffUrl,
  gffAdapterMode = "tabix",
  smallGffThresholdBytes = DEFAULT_SMALL_GFF_THRESHOLD,
) {
  const [resolved, setResolved] = useState(
    gffAdapterMode === "auto" ? null : gffAdapterMode,
  );
  useEffect(() => {
    if (gffAdapterMode !== "auto") {
      setResolved(gffAdapterMode);
      return;
    }
    let cancelled = false;
    async function resolve() {
      const size = await fetchGffContentLength(gffUrl);
      if (cancelled) return;
      const usePlain = size != null && size < smallGffThresholdBytes;
      setResolved(usePlain ? "plain" : "tabix");
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [gffUrl, gffAdapterMode, smallGffThresholdBytes]);
  return resolved;
}
