"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeneViewerSessionSync = void 0;
const react_1 = require("react");
const featureAttrUtils_1 = require("../utils/featureAttrUtils");
const constants_1 = require("../constants");
function useGeneViewerSessionSync(opts) {
  const { viewState, lastTableSelectionTimeRef, setSelectedGeneId, joinAttr } =
    opts;
  (0, react_1.useEffect)(() => {
    if (!viewState) return;
    const session = viewState.session;
    if (!session) return;
    const getLocusFromSelection = () => {
      var _a;
      const sel = session.selection;
      if (!sel) return null;
      const feature = (_a = sel.feature) !== null && _a !== void 0 ? _a : sel;
      if (!feature) return null;
      return (0, featureAttrUtils_1.extractLocusFromFeature)(feature, joinAttr);
    };
    const tick = () => {
      try {
        if (
          Date.now() - lastTableSelectionTimeRef.current <
          constants_1.TABLE_SELECTION_COOLDOWN_MS
        )
          return;
        const locus = getLocusFromSelection();
        if (locus) {
          if (typeof window !== "undefined") window.selectedGeneId = locus;
          setSelectedGeneId((prev) => (prev === locus ? prev : locus));
        }
      } catch (_a) {
        // ignore
      }
    };
    tick();
    const id = window.setInterval(tick, constants_1.SESSION_SELECTION_POLL_MS);
    return () => window.clearInterval(id);
  }, [viewState, joinAttr, lastTableSelectionTimeRef, setSelectedGeneId]);
}
exports.useGeneViewerSessionSync = useGeneViewerSessionSync;
