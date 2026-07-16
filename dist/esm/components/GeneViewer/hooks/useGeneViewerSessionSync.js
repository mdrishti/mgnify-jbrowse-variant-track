import { useEffect } from "react";
import { extractLocusFromFeature } from "../utils/featureAttrUtils";
import {
  TABLE_SELECTION_COOLDOWN_MS,
  SESSION_SELECTION_POLL_MS,
} from "../constants";
export function useGeneViewerSessionSync(opts) {
  const { viewState, lastTableSelectionTimeRef, setSelectedGeneId, joinAttr } =
    opts;
  useEffect(() => {
    if (!viewState) return;
    const session = viewState.session;
    if (!session) return;
    const getLocusFromSelection = () => {
      var _a;
      const sel = session.selection;
      if (!sel) return null;
      const feature = (_a = sel.feature) !== null && _a !== void 0 ? _a : sel;
      if (!feature) return null;
      return extractLocusFromFeature(feature, joinAttr);
    };
    const tick = () => {
      try {
        if (
          Date.now() - lastTableSelectionTimeRef.current <
          TABLE_SELECTION_COOLDOWN_MS
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
    const id = window.setInterval(tick, SESSION_SELECTION_POLL_MS);
    return () => window.clearInterval(id);
  }, [viewState, joinAttr, lastTableSelectionTimeRef, setSelectedGeneId]);
}
