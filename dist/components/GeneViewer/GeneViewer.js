"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_app2_1 = require("@jbrowse/react-app2");
const gff_1 = require("./gff");
const plugin_1 = require("./jbrowse/plugin");
const config_1 = require("./jbrowse/config");
const components_1 = require("./components");
const constants_1 = require("./constants");
const useGeneViewerEssentiality_1 = require("./hooks/useGeneViewerEssentiality");
const useGeneViewerSessionSync_1 = require("./hooks/useGeneViewerSessionSync");
const useGeneViewerClickHandler_1 = require("./hooks/useGeneViewerClickHandler");
const useJBrowseVisibleRegion_1 = require("./hooks/useJBrowseVisibleRegion");
const useGeneViewerInit_1 = require("./hooks/useGeneViewerInit");
const useResolvedGffAdapterMode_1 = require("./hooks/useResolvedGffAdapterMode");
const useGeneViewerZoom_1 = require("./hooks/useGeneViewerZoom");
const useGeneViewerTrackRefresh_1 = require("./hooks/useGeneViewerTrackRefresh");
const useGeneViewerTableNav_1 = require("./hooks/useGeneViewerTableNav");
const useGeneViewerHideDrawer_1 = require("./hooks/useGeneViewerHideDrawer");
const useGeneViewerResizeSync_1 = require("./hooks/useGeneViewerResizeSync");
const useGeneViewerSelection_1 = require("./hooks/useGeneViewerSelection");
function GeneViewer(props) {
  var _a,
    _b,
    _c,
    _d,
    _e,
    _f,
    _g,
    _h,
    _j,
    _k,
    _l,
    _m,
    _o,
    _p,
    _q,
    _r,
    _s,
    _t,
    _u,
    _v,
    _w,
    _x;
  const [viewState, setViewState] = (0, react_1.useState)(null);
  const [error, setError] = (0, react_1.useState)(null);
  const [essentialityEnabled, setEssentialityEnabled] = (0, react_1.useState)(
    !!((_a = props.essentiality) === null || _a === void 0
      ? void 0
      : _a.enabled),
  );
  const [selectedGeneId, setSelectedGeneId] = (0, react_1.useState)(
    (_c =
      (_b = props.initialSelection) === null || _b === void 0
        ? void 0
        : _b.locusTag) !== null && _c !== void 0
      ? _c
      : null,
  );
  const [genesInView, setGenesInView] = (0, react_1.useState)([]);
  const genesInViewRef = (0, react_1.useRef)([]);
  genesInViewRef.current = genesInView;
  /** After a table click we skip syncing from session.selection for a short window so the poll doesn't overwrite back to the previous gene */
  const lastTableSelectionTimeRef = (0, react_1.useRef)(0);
  /** Ensure we only navigate once per table click; otherwise session poll can change selectedFeature and trigger a second nav to a wrong place */
  const hasNavigatedThisTableClickRef = (0, react_1.useRef)(false);
  /** Apply initial zoom once when view is ready so more than two genes are visible (showAllRegions). */
  const initialZoomAppliedRef = (0, react_1.useRef)(false);
  const jbrowseContainerRef = (0, react_1.useRef)(null);
  const joinAttribute =
    (_e =
      (_d = props.essentiality) === null || _d === void 0
        ? void 0
        : _d.featureJoinAttribute) !== null && _e !== void 0
      ? _e
      : "locus_tag";
  const gff = props.annotation.gff;
  const gffAdapterMode =
    (_f = gff.gffAdapterMode) !== null && _f !== void 0 ? _f : "auto";
  const resolvedGffAdapterMode = (0,
  useResolvedGffAdapterMode_1.useResolvedGffAdapterMode)(
    gff.gffUrl,
    gffAdapterMode,
    (_g = gff.smallGffThresholdBytes) !== null && _g !== void 0 ? _g : 256000,
  );
  // Resolve a clicked feature id (e.g. GFF ID or locus_tag) to the canonical locus_tag for selection/panel/table
  const resolveToLocusTag = (0, react_1.useCallback)(
    (featureId, features) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const norm = String(featureId).trim();
      if (!norm) return featureId;
      for (const f of features) {
        const attrs = (_a = f.attributes) !== null && _a !== void 0 ? _a : {};
        const locus = String(
          (_f =
            (_e =
              (_d =
                (_c =
                  (_b = attrs[joinAttribute]) !== null && _b !== void 0
                    ? _b
                    : attrs.locus_tag) !== null && _c !== void 0
                  ? _c
                  : f.locus_tag) !== null && _d !== void 0
                ? _d
                : attrs.ID) !== null && _e !== void 0
              ? _e
              : f.id) !== null && _f !== void 0
            ? _f
            : "",
        ).trim();
        const id = String(
          (_h = (_g = attrs.ID) !== null && _g !== void 0 ? _g : f.id) !==
            null && _h !== void 0
            ? _h
            : "",
        ).trim();
        if (norm === locus || norm === id) return locus || id || featureId;
      }
      return featureId;
    },
    [joinAttribute],
  );
  const genesInViewTypes = (0, react_1.useMemo)(() => {
    var _a, _b;
    return (_b =
      (_a = props.ui) === null || _a === void 0
        ? void 0
        : _a.genesInViewTypes) !== null && _b !== void 0
      ? _b
      : ["CDS"];
  }, [
    (_h = props.ui) === null || _h === void 0 ? void 0 : _h.genesInViewTypes,
  ]);
  // Keep internal essentiality-enabled in sync with props changes
  (0, react_1.useEffect)(() => {
    var _a;
    setEssentialityEnabled(
      !!((_a = props.essentiality) === null || _a === void 0
        ? void 0
        : _a.enabled),
    );
  }, [
    (_j = props.essentiality) === null || _j === void 0 ? void 0 : _j.enabled,
  ]);
  const { essentialityIndex, essentialityError } = (0,
  useGeneViewerEssentiality_1.useGeneViewerEssentiality)({
    enabled: essentialityEnabled,
    csvUrl:
      (_k = props.essentiality) === null || _k === void 0 ? void 0 : _k.csvUrl,
    csvJoinColumn:
      (_l = props.essentiality) === null || _l === void 0
        ? void 0
        : _l.csvJoinColumn,
    csvStatusColumn:
      (_m = props.essentiality) === null || _m === void 0
        ? void 0
        : _m.csvStatusColumn,
  });
  (0, react_1.useEffect)(() => {
    if (essentialityError) setError(essentialityError);
  }, [essentialityError]);
  // Compute visible region and query genes-in-view from GFF (must run before selectedFeature/selectedLocusTag)
  const visibleRegion = (0, useJBrowseVisibleRegion_1.useJBrowseVisibleRegion)(
    viewState,
    constants_1.VISIBLE_REGION_POLL_MS,
  );
  const gffQueryAbortRef = (0, react_1.useRef)({ cancelled: false });
  (0, react_1.useEffect)(() => {
    if (!visibleRegion || resolvedGffAdapterMode === null) return;
    const { refName, start, end } = visibleRegion;
    const regionLen = end - start;
    const buffer = Math.max(
      0,
      Math.floor(regionLen * constants_1.GFF_QUERY_BUFFER_RATIO),
    );
    const qStart = Math.max(0, start - buffer);
    const qEnd = end + buffer;
    gffQueryAbortRef.current.cancelled = true;
    gffQueryAbortRef.current = { cancelled: false };
    const token = gffQueryAbortRef.current;
    const run = async () => {
      var _a;
      try {
        const feats =
          resolvedGffAdapterMode === "plain"
            ? await (0, gff_1.queryGffRegionFromPlainGff)({
                gffUrl: gff.gffUrl,
                refName,
                start: qStart,
                end: qEnd,
                featureTypes: genesInViewTypes,
              })
            : await (0, gff_1.queryGffRegion)({
                gffUrl: gff.gffUrl,
                csiUrl: gff.csiUrl,
                refName,
                start: qStart,
                end: qEnd,
                featureTypes: genesInViewTypes,
              });
        if (!token.cancelled) setGenesInView(feats);
      } catch (e) {
        if (!token.cancelled)
          setError(
            (_a = e === null || e === void 0 ? void 0 : e.message) !== null &&
              _a !== void 0
              ? _a
              : String(e),
          );
      }
    };
    const id = window.setTimeout(run, constants_1.GFF_QUERY_DEBOUNCE_MS);
    return () => {
      token.cancelled = true;
      window.clearTimeout(id);
    };
  }, [
    visibleRegion,
    resolvedGffAdapterMode,
    gff.gffUrl,
    gff.csiUrl,
    genesInViewTypes,
  ]);
  const { selectedFeatures, selectedLocusTag, selectedEssentiality } = (0,
  useGeneViewerSelection_1.useGeneViewerSelection)(
    selectedGeneId,
    genesInView,
    joinAttribute,
    essentialityEnabled,
    essentialityIndex,
    (_o = props.essentiality) === null || _o === void 0 ? void 0 : _o.colorMap,
  );
  // Keep JEXL context up to date (selection + essentiality) so track highlight (blue bar) works.
  // useLayoutEffect so context is set before paint and before track re-render from reload().
  (0, react_1.useLayoutEffect)(() => {
    var _a;
    (0, plugin_1.setGeneViewerJexlContext)({
      selectedGeneId:
        selectedLocusTag !== null && selectedLocusTag !== void 0
          ? selectedLocusTag
          : selectedGeneId,
      essentialityEnabled,
      essentialityIndex: essentialityIndex,
      essentialityColorMap:
        (_a = props.essentiality) === null || _a === void 0
          ? void 0
          : _a.colorMap,
      featureJoinAttribute: joinAttribute,
      highlightColor: constants_1.COLORS.highlight,
    });
  }, [
    selectedLocusTag,
    selectedGeneId,
    essentialityEnabled,
    essentialityIndex,
    joinAttribute,
    (_p = props.essentiality) === null || _p === void 0 ? void 0 : _p.colorMap,
  ]);
  (0, useGeneViewerSessionSync_1.useGeneViewerSessionSync)({
    viewState,
    lastTableSelectionTimeRef,
    setSelectedGeneId,
    joinAttr: joinAttribute,
  });
  (0, useGeneViewerTrackRefresh_1.useGeneViewerTrackRefresh)(
    viewState,
    selectedLocusTag,
    selectedGeneId,
    essentialityIndex,
    essentialityEnabled,
  );
  (0, useGeneViewerTableNav_1.useGeneViewerTableNav)(
    viewState,
    (_q = selectedFeatures[0]) !== null && _q !== void 0 ? _q : null,
    lastTableSelectionTimeRef,
    hasNavigatedThisTableClickRef,
  );
  const assemblyConfig = (0, react_1.useMemo)(
    () => (0, config_1.buildAssemblyConfig)(props),
    [props],
  );
  const tracksConfig = (0, react_1.useMemo)(
    () =>
      (0, config_1.buildTracksConfig)(props, {
        adapterMode:
          resolvedGffAdapterMode !== null && resolvedGffAdapterMode !== void 0
            ? resolvedGffAdapterMode
            : "tabix",
      }),
    [props, resolvedGffAdapterMode],
  );
  const initReady =
    gffAdapterMode !== "auto" || resolvedGffAdapterMode !== null;
  (0, useGeneViewerInit_1.useGeneViewerInit)(
    props,
    assemblyConfig,
    tracksConfig,
    setViewState,
    setError,
    initialZoomAppliedRef,
    initReady,
  );
  (0, useGeneViewerZoom_1.useGeneViewerZoom)(
    viewState,
    props,
    initialZoomAppliedRef,
  );
  (0, useGeneViewerClickHandler_1.useGeneViewerClickHandler)({
    viewState,
    containerRef: jbrowseContainerRef,
    genesInViewRef,
    lastTableSelectionTimeRef,
    setSelectedGeneId,
    resolveToLocusTag,
    joinAttribute,
  });
  const showLegends =
    (_s =
      (_r = props.ui) === null || _r === void 0 ? void 0 : _r.showLegends) !==
      null && _s !== void 0
      ? _s
      : true;
  const showPanel =
    (_u =
      (_t = props.ui) === null || _t === void 0
        ? void 0
        : _t.showFeaturePanel) !== null && _u !== void 0
      ? _u
      : true;
  const showTable =
    (_w =
      (_v = props.ui) === null || _v === void 0
        ? void 0
        : _v.showGenesInViewTable) !== null && _w !== void 0
      ? _w
      : true;
  const heightPx =
    (_x = props.heightPx) !== null && _x !== void 0
      ? _x
      : constants_1.DEFAULT_VIEWER_HEIGHT_PX;
  (0, useGeneViewerHideDrawer_1.useGeneViewerHideDrawer)(
    viewState,
    jbrowseContainerRef,
  );
  (0, useGeneViewerResizeSync_1.useGeneViewerResizeSync)(
    viewState,
    jbrowseContainerRef,
  );
  return (0, jsx_runtime_1.jsxs)("div", {
    style: {
      width: "100%",
      border: `1px solid ${constants_1.COLORS.border}`,
      borderRadius: 10,
      overflow: "hidden",
    },
    children: [
      showLegends
        ? (0, jsx_runtime_1.jsx)(components_1.GeneViewerLegends, {
            essentiality: props.essentiality,
            essentialityEnabled: essentialityEnabled,
            onToggleEssentiality: (next) => setEssentialityEnabled(next),
          })
        : null,
      error
        ? (0, jsx_runtime_1.jsx)("div", {
            style: {
              padding: 12,
              background: constants_1.COLORS.errorBg,
              borderBottom: `1px solid ${constants_1.COLORS.errorBorder}`,
              color: constants_1.COLORS.errorText,
            },
            children: error,
          })
        : null,
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          padding: "4px 12px",
          fontSize: 11,
          color: constants_1.COLORS.textMuted,
          background: constants_1.COLORS.backgroundLight,
          borderBottom: `1px solid ${constants_1.COLORS.border}`,
        },
        title:
          "Shows current selection \u2013 click a gene in the track or a row in the table",
        children: [
          "Selected: ",
          selectedLocusTag !== null && selectedLocusTag !== void 0
            ? selectedLocusTag
            : "—",
          " (genes in view: ",
          genesInView.length,
          ")",
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          display: "grid",
          gridTemplateColumns: showPanel
            ? `1fr ${constants_1.FEATURE_PANEL_WIDTH_PX}px`
            : "1fr",
          width: "100%",
        },
        children: [
          (0, jsx_runtime_1.jsx)("div", {
            ref: jbrowseContainerRef,
            style: {
              width: "100%",
              minWidth: 0,
              minHeight: heightPx,
              maxHeight: heightPx,
              overflow: "hidden",
            },
            children: viewState
              ? (0, jsx_runtime_1.jsx)(react_app2_1.JBrowseApp, {
                  viewState: viewState,
                })
              : (0, jsx_runtime_1.jsx)("div", {
                  style: { padding: 12, color: constants_1.COLORS.textMuted },
                  children: "Loading JBrowse\u2026",
                }),
          }),
          showPanel
            ? (0, jsx_runtime_1.jsx)("div", {
                style: {
                  borderLeft: `1px solid ${constants_1.COLORS.border}`,
                  height: heightPx,
                  overflowY: "auto",
                  overflowX: "hidden",
                },
                children: (0, jsx_runtime_1.jsx)(components_1.FeaturePanel, {
                  features: selectedFeatures,
                  essentiality: selectedEssentiality,
                }),
              })
            : null,
        ],
      }),
      showTable
        ? (0, jsx_runtime_1.jsxs)("div", {
            style: {
              display: "grid",
              gridTemplateColumns: showPanel
                ? `1fr ${constants_1.FEATURE_PANEL_WIDTH_PX}px`
                : "1fr",
            },
            children: [
              (0, jsx_runtime_1.jsx)("div", {
                children: (0, jsx_runtime_1.jsx)(
                  components_1.GenesInViewTable,
                  {
                    features: genesInView,
                    selectedId: selectedLocusTag,
                    onSelect: (id) => {
                      lastTableSelectionTimeRef.current = Date.now();
                      hasNavigatedThisTableClickRef.current = false;
                      if (typeof window !== "undefined")
                        window.selectedGeneId = id;
                      setSelectedGeneId(id);
                    },
                    joinAttribute: joinAttribute,
                  },
                ),
              }),
              showPanel ? (0, jsx_runtime_1.jsx)("div", {}) : null,
            ],
          })
        : null,
    ],
  });
}
exports.default = GeneViewer;
