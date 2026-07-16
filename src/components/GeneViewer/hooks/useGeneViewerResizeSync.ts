import { useEffect } from "react";

/** Sync JBrowse view width with container when it mounts or resizes. Fixes half-width layout when container size changes. */
export function useGeneViewerResizeSync(
  viewState: any,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!viewState) return;
    const container = containerRef.current;
    if (!container) return;

    const syncWidth = () => {
      try {
        const view = viewState.session?.views?.[0];
        if (!view || typeof view.setWidth !== "function") return;

        const w = container.clientWidth;
        if (w > 0) {
          view.setWidth(w);
        }
      } catch {
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
