"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useResolvedGffAdapterMode = void 0;
const react_1 = require("react");
const gff_1 = require("../gff");
const DEFAULT_SMALL_GFF_THRESHOLD = 256000;
function useResolvedGffAdapterMode(
  gffUrl,
  gffAdapterMode = "tabix",
  smallGffThresholdBytes = DEFAULT_SMALL_GFF_THRESHOLD,
) {
  const [resolved, setResolved] = (0, react_1.useState)(
    gffAdapterMode === "auto" ? null : gffAdapterMode,
  );
  (0, react_1.useEffect)(() => {
    if (gffAdapterMode !== "auto") {
      setResolved(gffAdapterMode);
      return;
    }
    let cancelled = false;
    async function resolve() {
      const size = await (0, gff_1.fetchGffContentLength)(gffUrl);
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
exports.useResolvedGffAdapterMode = useResolvedGffAdapterMode;
