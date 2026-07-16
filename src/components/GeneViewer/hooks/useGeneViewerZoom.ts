import { useEffect } from "react";
import {
  DEFAULT_INITIAL_VISIBLE_BP,
  ZOOM_RETRY_MAX,
  ZOOM_RETRY_INTERVAL_MS,
} from "../constants";

export function useGeneViewerZoom(
  viewState: any,
  props: { initialBpPerPx?: number; initialVisibleBp?: number },
  initialZoomAppliedRef: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (!viewState || initialZoomAppliedRef.current) return;
    const view = viewState.session?.views?.[0];
    if (!view || view.type !== "LinearGenomeView") return;

    const apply = () => {
      try {
        const width = (view as any).width ?? 800;
        const bpPerPx = props.initialBpPerPx;
        const visibleBp = props.initialVisibleBp ?? DEFAULT_INITIAL_VISIBLE_BP;

        if (typeof bpPerPx === "number" && Number.isFinite(bpPerPx)) {
          (view as any).zoomTo?.(bpPerPx);
        } else if (visibleBp > 0 && width > 0) {
          (view as any).zoomTo?.(visibleBp / width);
        } else if (typeof view.showAllRegions === "function") {
          view.showAllRegions();
        }
        initialZoomAppliedRef.current = true;
      } catch {
        // ignore
      }
    };

    if (view.initialized) {
      apply();
      return;
    }
    let count = 0;
    const id = window.setInterval(() => {
      count++;
      if (view.initialized || count >= ZOOM_RETRY_MAX) {
        if (view.initialized) apply();
        window.clearInterval(id);
      }
    }, ZOOM_RETRY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [viewState, props.initialBpPerPx, props.initialVisibleBp]);
}
