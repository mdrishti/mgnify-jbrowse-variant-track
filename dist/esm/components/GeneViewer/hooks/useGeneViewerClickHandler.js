import { useEffect } from "react";
import { extractLocusFromFeature } from "../utils/featureAttrUtils";
import { CLICK_DEBOUNCE_MS } from "../constants";
export function useGeneViewerClickHandler(opts) {
  const {
    viewState,
    containerRef,
    genesInViewRef,
    lastTableSelectionTimeRef,
    setSelectedGeneId,
    resolveToLocusTag,
    joinAttribute,
  } = opts;
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !viewState) return;
    const joinAttr = opts.joinAttribute;
    const handleClick = (e) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const target = e.target;
      if (!container.contains(target)) return;
      const boxEl =
        (_a = target.closest) === null || _a === void 0
          ? void 0
          : _a.call(target, '[data-testid^="box-"]');
      const overlayEl = !boxEl
        ? (_b = target.closest) === null || _b === void 0
          ? void 0
          : _b.call(target, "[data-testid]")
        : null;
      const el = boxEl !== null && boxEl !== void 0 ? boxEl : overlayEl;
      if (!el) return;
      let rawId = boxEl
        ? (_d =
            (_c = boxEl.getAttribute("data-testid")) === null || _c === void 0
              ? void 0
              : _c.replace(/^box-/, "")) === null || _d === void 0
          ? void 0
          : _d.trim()
        : (_e =
              overlayEl === null || overlayEl === void 0
                ? void 0
                : overlayEl.getAttribute("data-testid")) === null ||
            _e === void 0
          ? void 0
          : _e.trim();
      if (!rawId) return;
      if (
        /(container|tracks?|svg|placeholder|display)/i.test(rawId) ||
        rawId === "svgfeatures"
      )
        return;
      if (Date.now() - lastTableSelectionTimeRef.current < CLICK_DEBOUNCE_MS)
        return;
      const session = viewState.session;
      if (!session) return;
      let locus = null;
      let feature = null;
      const view =
        (_f = session.views) === null || _f === void 0 ? void 0 : _f[0];
      const tracks =
        (_g = view === null || view === void 0 ? void 0 : view.tracks) !==
          null && _g !== void 0
          ? _g
          : [];
      for (const track of tracks) {
        const conf = track.configuration;
        const trackId =
          typeof conf === "string"
            ? conf
            : conf === null || conf === void 0
              ? void 0
              : conf.trackId;
        if (trackId === "gene_features") {
          const display =
            (_h = track.displays) === null || _h === void 0 ? void 0 : _h[0];
          const featuresMap =
            display === null || display === void 0 ? void 0 : display.features;
          if (featuresMap && typeof featuresMap.get === "function") {
            feature = featuresMap.get(rawId);
            if (feature) {
              locus = extractLocusFromFeature(feature, joinAttr);
              break;
            }
          }
          break;
        }
      }
      if (!locus) {
        locus = resolveToLocusTag(rawId, genesInViewRef.current) || null;
        const hasMatchingFeature = genesInViewRef.current.some(
          (f) => extractLocusFromFeature(f, joinAttr) === rawId,
        );
        if (locus === rawId && !hasMatchingFeature) {
          locus = null;
        }
      }
      if (locus) {
        lastTableSelectionTimeRef.current = Date.now();
        setSelectedGeneId(locus);
        if (feature && typeof session.setSelection === "function") {
          session.setSelection(feature);
        }
        e.stopPropagation();
        e.preventDefault();
      }
    };
    container.addEventListener("click", handleClick, true);
    return () => container.removeEventListener("click", handleClick, true);
  }, [viewState, resolveToLocusTag, joinAttribute]);
}
