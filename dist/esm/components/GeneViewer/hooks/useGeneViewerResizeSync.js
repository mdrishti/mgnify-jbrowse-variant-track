import { useEffect } from "react";
/** Sync JBrowse view width with container when it mounts or resizes. Fixes half-width layout when container size changes. */
export function useGeneViewerResizeSync(viewState, containerRef) {
  useEffect(() => {
    if (!viewState) return;
    const container = containerRef.current;
    if (!container) return;
    const syncWidth = () => {
      var _a, _b;
      try {
        const view =
          (_b =
            (_a = viewState.session) === null || _a === void 0
              ? void 0
              : _a.views) === null || _b === void 0
            ? void 0
            : _b[0];
        if (!view || typeof view.setWidth !== "function") return;
        const w = container.clientWidth;
        if (w > 0) {
          view.setWidth(w);
        }
      } catch (_c) {
        // ignore
      }
    };
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(container);
    const t = window.setTimeout(syncWidth, 100);
    const t2 = window.setTimeout(syncWidth, 500);
    return () => {
      observer.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [viewState, containerRef]);
}
