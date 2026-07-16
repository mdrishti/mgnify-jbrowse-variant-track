import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_VISIBLE_BP } from "../constants";
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
  const rangeLen = end - start;
  if (rangeLen > MAX_VISIBLE_BP) {
    const center = Math.floor((start + end) / 2);
    start = Math.max(regionStart, center - Math.floor(MAX_VISIBLE_BP / 2));
    end = Math.min(regionEnd, start + MAX_VISIBLE_BP);
    if (start > end) [start, end] = [end, start];
  }
  return {
    refName,
    start,
    end,
    assemblyName: region.assemblyName,
  };
}
export function useJBrowseVisibleRegion(viewState, pollingMs = 200) {
  const [region, setRegion] = useState(null);
  const lastSigRef = useRef("");
  const stablePollingMs = useMemo(() => pollingMs, [pollingMs]);
  useEffect(() => {
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
