import { useEffect } from "react";
import { TABLE_NAV_WINDOW_MS } from "../constants";
/** When user selects a gene from the table, center that gene in the current view. Runs once per table click. */
export function useGeneViewerTableNav(
  viewState,
  selectedFeature,
  lastTableSelectionTimeRef,
  hasNavigatedThisTableClickRef,
) {
  useEffect(() => {
    var _a, _b;
    if (!viewState || !selectedFeature) return;
    if (Date.now() - lastTableSelectionTimeRef.current >= TABLE_NAV_WINDOW_MS)
      return;
    if (hasNavigatedThisTableClickRef.current) return;
    const view =
      (_b =
        (_a = viewState.session) === null || _a === void 0
          ? void 0
          : _a.views) === null || _b === void 0
        ? void 0
        : _b[0];
    if (!view || view.type !== "LinearGenomeView" || !view.initialized) return;
    try {
      hasNavigatedThisTableClickRef.current = true;
      const midBp = Math.round(
        (selectedFeature.start + selectedFeature.end) / 2,
      );
      const refName = selectedFeature.refName;
      if (typeof view.centerAt === "function") {
        view.centerAt(midBp, refName, 0);
      }
    } catch (_c) {
      hasNavigatedThisTableClickRef.current = false;
    }
  }, [viewState, selectedFeature]);
}
