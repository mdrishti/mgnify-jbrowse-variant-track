import { useEffect } from "react";
import { VIEW_REPAINT_DELAY_MS } from "../constants";

/** Force track re-render when selection or essentiality changes so JEXL (getGeneColor) runs again. */
export function useGeneViewerTrackRefresh(
  viewState: any,
  selectedLocusTag: string | null,
  selectedGeneId: string | null,
  essentialityIndex: Map<string, string>,
  essentialityEnabled: boolean,
) {
  useEffect(() => {
    if (!viewState) return;
    try {
      const view = viewState.session?.views?.[0];
      if (!view?.tracks) return;

      const geneTrackId = "gene_features";
      let refreshed = false;
      if (
        typeof view.hideTrack === "function" &&
        typeof view.showTrack === "function"
      ) {
        try {
          const hidden = view.hideTrack(geneTrackId);
          if (hidden > 0) {
            view.showTrack(geneTrackId);
            refreshed = true;
          }
        } catch {
          // ignore
        }
      }
      if (!refreshed) {
        view.tracks.forEach((track: any) => {
          track?.displays?.forEach((display: any) => {
            try {
              display?.reload?.();
            } catch {
              // ignore
            }
          });
        });
      }
      if (typeof view.setWidth === "function" && view.width != null) {
        const w = view.width;
        view.setWidth(w + 0.001);
        const t = window.setTimeout(() => {
          try {
            view.setWidth(w);
          } catch {
            // ignore
          }
        }, VIEW_REPAINT_DELAY_MS);
        return () => window.clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [
    viewState,
    selectedLocusTag,
    selectedGeneId,
    essentialityIndex,
    essentialityEnabled,
  ]);
}
