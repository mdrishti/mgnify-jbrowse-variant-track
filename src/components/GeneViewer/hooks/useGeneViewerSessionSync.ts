import { useEffect } from "react";
import { extractLocusFromFeature } from "../utils/featureAttrUtils";
import {
  TABLE_SELECTION_COOLDOWN_MS,
  SESSION_SELECTION_POLL_MS,
} from "../constants";

export function useGeneViewerSessionSync(opts: {
  viewState: any;
  lastTableSelectionTimeRef: React.MutableRefObject<number>;
  setSelectedGeneId: (
    v: string | null | ((prev: string | null) => string | null),
  ) => void;
  joinAttr: string;
}) {
  const { viewState, lastTableSelectionTimeRef, setSelectedGeneId, joinAttr } =
    opts;

  useEffect(() => {
    if (!viewState) return;
    const session: any = viewState.session;
    if (!session) return;

    const getLocusFromSelection = (): string | null => {
      const sel = session.selection;
      if (!sel) return null;
      const feature = sel.feature ?? sel;
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
          if (typeof window !== "undefined")
            (window as any).selectedGeneId = locus;
          setSelectedGeneId((prev) => (prev === locus ? prev : locus));
        }
      } catch {
        // ignore
      }
    };

    tick();
    const id = window.setInterval(tick, SESSION_SELECTION_POLL_MS);
    return () => window.clearInterval(id);
  }, [viewState, joinAttr, lastTableSelectionTimeRef, setSelectedGeneId]);
}
