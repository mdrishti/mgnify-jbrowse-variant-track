"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useJBrowseVisibleRegion = void 0;
const react_1 = require("react");
const constants_1 = require("./constants");
function computeVisibleRegion(viewState) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
  const session =
    viewState === null || viewState === void 0 ? void 0 : viewState.session;
  const view =
    (_a = session === null || session === void 0 ? void 0 : session.views) ===
      null || _a === void 0
      ? void 0
      : _a[0];
  const region =
    (_b = view === null || view === void 0 ? void 0 : view.displayedRegions) ===
      null || _b === void 0
      ? void 0
      : _b[0];
  if (!view || !region) return null;
  // JBrowse views expose `initialized`; accessing layout-dependent props like
  // `width` before initialization can throw (e.g. "width undefined, make sure
  // to check for model.initialized"). Bail out until the view is ready.
  if (view.initialized === false) {
    return null;
  }
  const refName = region.refName;
  if (!refName) return null;
  const regionStart = (_c = region.start) !== null && _c !== void 0 ? _c : 0;
  const regionEnd =
    (_d = region.end) !== null && _d !== void 0 ? _d : regionStart;
  const bpPerPx =
    view.bpPerPx ||
    ((_e = view.volatile) === null || _e === void 0 ? void 0 : _e.bpPerPx);
  const width =
    (_h =
      (_f = view.width) !== null && _f !== void 0
        ? _f
        : (_g = view.volatile) === null || _g === void 0
          ? void 0
          : _g.width) !== null && _h !== void 0
      ? _h
      : 800;
  const offsetPx =
    (_l =
      (_j = view.offsetPx) !== null && _j !== void 0
        ? _j
        : (_k = view.volatile) === null || _k === void 0
          ? void 0
          : _k.offsetPx) !== null && _l !== void 0
      ? _l
      : 0;
  let start = regionStart;
  let end = regionEnd;
  try {
    if (typeof view.pxToBp === "function") {
      const left = view.pxToBp(0);
      const right = view.pxToBp(width);
      const startBp = left === null || left === void 0 ? void 0 : left.coord;
      const endBp = right === null || right === void 0 ? void 0 : right.coord;
      if (Number.isFinite(startBp) && Number.isFinite(endBp)) {
        const lo = Math.min(startBp, endBp);
        const hi = Math.max(startBp, endBp);
        start = Math.max(regionStart, Math.floor(lo));
        end = Math.min(regionEnd, Math.ceil(hi));
      }
    } else if (bpPerPx && width) {
      const offsetBp = offsetPx * bpPerPx;
      const widthBp = width * bpPerPx;
      start = Math.max(regionStart, Math.floor(regionStart + offsetBp));
      end = Math.min(regionEnd, Math.floor(start + widthBp));
    }
  } catch (_m) {
    // fall back to displayed region bounds
  }
  if (start > end) [start, end] = [end, start];
  // If the computed range is huge (e.g. view.width was full track width, not viewport), cap to a
  // reasonable "visible" window so "genes in view" count matches what the user sees on screen.
  const rangeLen = end - start;
  if (rangeLen > constants_1.MAX_VISIBLE_BP) {
    const center = Math.floor((start + end) / 2);
    start = Math.max(
      regionStart,
      center - Math.floor(constants_1.MAX_VISIBLE_BP / 2),
    );
    end = Math.min(regionEnd, start + constants_1.MAX_VISIBLE_BP);
    if (start > end) [start, end] = [end, start];
  }
  return {
    refName,
    start,
    end,
    assemblyName: region.assemblyName,
  };
}
function useJBrowseVisibleRegion(viewState, pollingMs = 200) {
  const [region, setRegion] = (0, react_1.useState)(null);
  const lastSigRef = (0, react_1.useRef)("");
  const stablePollingMs = (0, react_1.useMemo)(() => pollingMs, [pollingMs]);
  (0, react_1.useEffect)(() => {
    if (!viewState) return;
    const tick = () => {
      const next = computeVisibleRegion(viewState);
      if (!next) return;
      const sig = `${next.refName}:${next.start}:${next.end}`;
      if (sig === lastSigRef.current) return;
      lastSigRef.current = sig;
      setRegion(next);
    };
    tick();
    const id = window.setInterval(tick, stablePollingMs);
    return () => window.clearInterval(id);
  }, [viewState, stablePollingMs]);
  return region;
}
exports.useJBrowseVisibleRegion = useJBrowseVisibleRegion;
