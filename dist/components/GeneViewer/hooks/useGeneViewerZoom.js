"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeneViewerZoom = void 0;
const react_1 = require("react");
const constants_1 = require("../constants");
function useGeneViewerZoom(viewState, props, initialZoomAppliedRef) {
  (0, react_1.useEffect)(() => {
    var _a, _b;
    if (!viewState || initialZoomAppliedRef.current) return;
    const view =
      (_b =
        (_a = viewState.session) === null || _a === void 0
          ? void 0
          : _a.views) === null || _b === void 0
        ? void 0
        : _b[0];
    if (!view || view.type !== "LinearGenomeView") return;
    const apply = () => {
      var _a, _b, _c, _d, _e, _f;
      try {
        const width = (_a = view.width) !== null && _a !== void 0 ? _a : 800;
        const bpPerPx = props.initialBpPerPx;
        const visibleBp =
          (_b = props.initialVisibleBp) !== null && _b !== void 0
            ? _b
            : constants_1.DEFAULT_INITIAL_VISIBLE_BP;
        if (typeof bpPerPx === "number" && Number.isFinite(bpPerPx)) {
          (_d = (_c = view).zoomTo) === null || _d === void 0
            ? void 0
            : _d.call(_c, bpPerPx);
        } else if (visibleBp > 0 && width > 0) {
          (_f = (_e = view).zoomTo) === null || _f === void 0
            ? void 0
            : _f.call(_e, visibleBp / width);
        } else if (typeof view.showAllRegions === "function") {
          view.showAllRegions();
        }
        initialZoomAppliedRef.current = true;
      } catch (_g) {
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
      if (view.initialized || count >= constants_1.ZOOM_RETRY_MAX) {
        if (view.initialized) apply();
        window.clearInterval(id);
      }
    }, constants_1.ZOOM_RETRY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [viewState, props.initialBpPerPx, props.initialVisibleBp]);
}
exports.useGeneViewerZoom = useGeneViewerZoom;
