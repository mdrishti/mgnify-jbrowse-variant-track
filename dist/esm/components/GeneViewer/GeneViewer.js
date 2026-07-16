import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { JBrowseApp } from "@jbrowse/react-app2";
import { queryGffRegion, queryGffRegionFromPlainGff } from "./gff";
import { setGeneViewerJexlContext } from "./jbrowse/plugin";
import { buildAssemblyConfig, buildTracksConfig } from "./jbrowse/config";
import {
  GeneViewerLegends,
  FeaturePanel,
  GenesInViewTable,
} from "./components";
import {
  VISIBLE_REGION_POLL_MS,
  GFF_QUERY_DEBOUNCE_MS,
  GFF_QUERY_BUFFER_RATIO,
  FEATURE_PANEL_WIDTH_PX,
  DEFAULT_VIEWER_HEIGHT_PX,
  COLORS,
} from "./constants";
import { useGeneViewerEssentiality } from "./hooks/useGeneViewerEssentiality";
import { useGeneViewerSessionSync } from "./hooks/useGeneViewerSessionSync";
import { useGeneViewerClickHandler } from "./hooks/useGeneViewerClickHandler";
import { useJBrowseVisibleRegion } from "./hooks/useJBrowseVisibleRegion";
import { useGeneViewerInit } from "./hooks/useGeneViewerInit";
import { useResolvedGffAdapterMode } from "./hooks/useResolvedGffAdapterMode";
import { useGeneViewerZoom } from "./hooks/useGeneViewerZoom";
import { useGeneViewerTrackRefresh } from "./hooks/useGeneViewerTrackRefresh";
import { useGeneViewerTableNav } from "./hooks/useGeneViewerTableNav";
import { useGeneViewerHideDrawer } from "./hooks/useGeneViewerHideDrawer";
import { useGeneViewerResizeSync } from "./hooks/useGeneViewerResizeSync";
import { useGeneViewerSelection } from "./hooks/useGeneViewerSelection";
export default function GeneViewer(props) {
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
  const [viewState, setViewState] = useState(null);
  const [error, setError] = useState(null);
  const [essentialityEnabled, setEssentialityEnabled] = useState(
    !!((_a = props.essentiality) === null || _a === void 0
      ? void 0
      : _a.enabled),
  );
  const [selectedGeneId, setSelectedGeneId] = useState(
    (_c =
      (_b = props.initialSelection) === null || _b === void 0
        ? void 0
        : _b.locusTag) !== null && _c !== void 0
      ? _c
      : null,
  );
  const [genesInView, setGenesInView] = useState([]);
  const genesInViewRef = useRef([]);
  genesInViewRef.current = genesInView;
  /** After a table click we skip syncing from session.selection for a short window so the poll doesn't overwrite back to the previous gene */
  const lastTableSelectionTimeRef = useRef(0);
  /** Ensure we only navigate once per table click; otherwise session poll can change selectedFeature and trigger a second nav to a wrong place */
  const hasNavigatedThisTableClickRef = useRef(false);
  /** Apply initial zoom once when view is ready so more than two genes are visible (showAllRegions). */
  const initialZoomAppliedRef = useRef(false);
  const jbrowseContainerRef = useRef(null);
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
  const resolvedGffAdapterMode = useResolvedGffAdapterMode(
    gff.gffUrl,
    gffAdapterMode,
    (_g = gff.smallGffThresholdBytes) !== null && _g !== void 0 ? _g : 256000,
  );
  // Resolve a clicked feature id (e.g. GFF ID or locus_tag) to the canonical locus_tag for selection/panel/table
  const resolveToLocusTag = useCallback(
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
  const genesInViewTypes = useMemo(() => {
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
  useEffect(() => {
    var _a;
    setEssentialityEnabled(
      !!((_a = props.essentiality) === null || _a === void 0
        ? void 0
        : _a.enabled),
    );
  }, [
    (_j = props.essentiality) === null || _j === void 0 ? void 0 : _j.enabled,
  ]);
  const { essentialityIndex, essentialityError } = useGeneViewerEssentiality({
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
  useEffect(() => {
    if (essentialityError) setError(essentialityError);
  }, [essentialityError]);
  // Compute visible region and query genes-in-view from GFF (must run before selectedFeature/selectedLocusTag)
  const visibleRegion = useJBrowseVisibleRegion(
    viewState,
    VISIBLE_REGION_POLL_MS,
  );
  const gffQueryAbortRef = useRef({ cancelled: false });
  useEffect(() => {
    if (!visibleRegion || resolvedGffAdapterMode === null) return;
    const { refName, start, end } = visibleRegion;
    const regionLen = end - start;
    const buffer = Math.max(0, Math.floor(regionLen * GFF_QUERY_BUFFER_RATIO));
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
            ? await queryGffRegionFromPlainGff({
                gffUrl: gff.gffUrl,
                refName,
                start: qStart,
                end: qEnd,
                featureTypes: genesInViewTypes,
              })
            : await queryGffRegion({
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
    const id = window.setTimeout(run, GFF_QUERY_DEBOUNCE_MS);
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
  const { selectedFeatures, selectedLocusTag, selectedEssentiality } =
    useGeneViewerSelection(
      selectedGeneId,
      genesInView,
      joinAttribute,
      essentialityEnabled,
      essentialityIndex,
      (_o = props.essentiality) === null || _o === void 0
        ? void 0
        : _o.colorMap,
    );
  // Keep JEXL context up to date (selection + essentiality) so track highlight (blue bar) works.
  // useLayoutEffect so context is set before paint and before track re-render from reload().
  useLayoutEffect(() => {
    var _a;
    setGeneViewerJexlContext({
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
      highlightColor: COLORS.highlight,
    });
  }, [
    selectedLocusTag,
    selectedGeneId,
    essentialityEnabled,
    essentialityIndex,
    joinAttribute,
    (_p = props.essentiality) === null || _p === void 0 ? void 0 : _p.colorMap,
  ]);
  useGeneViewerSessionSync({
    viewState,
    lastTableSelectionTimeRef,
    setSelectedGeneId,
    joinAttr: joinAttribute,
  });
  useGeneViewerTrackRefresh(
    viewState,
    selectedLocusTag,
    selectedGeneId,
    essentialityIndex,
    essentialityEnabled,
  );
  useGeneViewerTableNav(
    viewState,
    (_q = selectedFeatures[0]) !== null && _q !== void 0 ? _q : null,
    lastTableSelectionTimeRef,
    hasNavigatedThisTableClickRef,
  );
  const assemblyConfig = useMemo(() => buildAssemblyConfig(props), [props]);
  const tracksConfig = useMemo(
    () =>
      buildTracksConfig(props, {
        adapterMode:
          resolvedGffAdapterMode !== null && resolvedGffAdapterMode !== void 0
            ? resolvedGffAdapterMode
            : "tabix",
      }),
    [props, resolvedGffAdapterMode],
  );
  const initReady =
    gffAdapterMode !== "auto" || resolvedGffAdapterMode !== null;
  useGeneViewerInit(
    props,
    assemblyConfig,
    tracksConfig,
    setViewState,
    setError,
    initialZoomAppliedRef,
    initReady,
  );
  useGeneViewerZoom(viewState, props, initialZoomAppliedRef);
  useGeneViewerClickHandler({
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
      : DEFAULT_VIEWER_HEIGHT_PX;
  useGeneViewerHideDrawer(viewState, jbrowseContainerRef);
  useGeneViewerResizeSync(viewState, jbrowseContainerRef);
  return _jsxs("div", {
    style: {
      width: "100%",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      overflow: "hidden",
    },
    children: [
      showLegends
        ? _jsx(GeneViewerLegends, {
            essentiality: props.essentiality,
            essentialityEnabled: essentialityEnabled,
            onToggleEssentiality: (next) => setEssentialityEnabled(next),
          })
        : null,
      error
        ? _jsx("div", {
            style: {
              padding: 12,
              background: COLORS.errorBg,
              borderBottom: `1px solid ${COLORS.errorBorder}`,
              color: COLORS.errorText,
            },
            children: error,
          })
        : null,
      _jsxs("div", {
        style: {
          padding: "4px 12px",
          fontSize: 11,
          color: COLORS.textMuted,
          background: COLORS.backgroundLight,
          borderBottom: `1px solid ${COLORS.border}`,
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
      _jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: showPanel
            ? `1fr ${FEATURE_PANEL_WIDTH_PX}px`
            : "1fr",
          width: "100%",
        },
        children: [
          _jsx("div", {
            ref: jbrowseContainerRef,
            style: {
              width: "100%",
              minWidth: 0,
              minHeight: heightPx,
              maxHeight: heightPx,
              overflow: "hidden",
            },
            children: viewState
              ? _jsx(JBrowseApp, { viewState: viewState })
              : _jsx("div", {
                  style: { padding: 12, color: COLORS.textMuted },
                  children: "Loading JBrowse\u2026",
                }),
          }),
          showPanel
            ? _jsx("div", {
                style: {
                  borderLeft: `1px solid ${COLORS.border}`,
                  height: heightPx,
                  overflowY: "auto",
                  overflowX: "hidden",
                },
                children: _jsx(FeaturePanel, {
                  features: selectedFeatures,
                  essentiality: selectedEssentiality,
                }),
              })
            : null,
        ],
      }),
      showTable
        ? _jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: showPanel
                ? `1fr ${FEATURE_PANEL_WIDTH_PX}px`
                : "1fr",
            },
            children: [
              _jsx("div", {
                children: _jsx(GenesInViewTable, {
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
                }),
              }),
              showPanel ? _jsx("div", {}) : null,
            ],
          })
        : null,
    ],
  });
}
