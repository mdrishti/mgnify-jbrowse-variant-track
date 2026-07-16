import { useEffect } from "react";
import { VIEW_REPAINT_DELAY_MS } from "../constants";
/** Force track re-render when selection or essentiality changes so JEXL (getGeneColor) runs again. */
export function useGeneViewerTrackRefresh(
  viewState,
  selectedLocusTag,
  selectedGeneId,
  essentialityIndex,
  essentialityEnabled,
) {
  useEffect(() => {
    var _a, _b;
    if (!viewState) return;
    try {
      const view =
        (_b =
          (_a = viewState.session) === null || _a === void 0
            ? void 0
            : _a.views) === null || _b === void 0
          ? void 0
          : _b[0];
      if (!(view === null || view === void 0 ? void 0 : view.tracks)) return;
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
        } catch (_c) {
          // ignore
        }
      }
      if (!refreshed) {
        view.tracks.forEach((track) => {
          var _a;
          (_a =
            track === null || track === void 0 ? void 0 : track.displays) ===
            null || _a === void 0
            ? void 0
            : _a.forEach((display) => {
                var _a;
                try {
                  (_a =
                    display === null || display === void 0
                      ? void 0
                      : display.reload) === null || _a === void 0
                    ? void 0
                    : _a.call(display);
                } catch (_b) {
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
          } catch (_a) {
            // ignore
          }
        }, VIEW_REPAINT_DELAY_MS);
        return () => window.clearTimeout(t);
      }
    } catch (_d) {
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
