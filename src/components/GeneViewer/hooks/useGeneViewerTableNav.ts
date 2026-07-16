import { useEffect } from "react";
import { TABLE_NAV_WINDOW_MS } from "../constants";
import type { GffFeature } from "../gff";

/** When user selects a gene from the table, center that gene in the current view. Runs once per table click. */
export function useGeneViewerTableNav(
  viewState: any,
  selectedFeature: GffFeature | null,
  lastTableSelectionTimeRef: React.MutableRefObject<number>,
  hasNavigatedThisTableClickRef: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (!viewState || !selectedFeature) return;
    if (Date.now() - lastTableSelectionTimeRef.current >= TABLE_NAV_WINDOW_MS)
      return;
    if (hasNavigatedThisTableClickRef.current) return;

    const view = viewState.session?.views?.[0];
    if (!view || view.type !== "LinearGenomeView" || !view.initialized) return;

    try {
      hasNavigatedThisTableClickRef.current = true;
      const midBp = Math.round(
        (selectedFeature.start + selectedFeature.end) / 2,
      );
      const refName = selectedFeature.refName;
      if (typeof (view as any).centerAt === "function") {
        (view as any).centerAt(midBp, refName, 0);
      }
    } catch {
      hasNavigatedThisTableClickRef.current = false;
    }
  }, [viewState, selectedFeature]);
}
