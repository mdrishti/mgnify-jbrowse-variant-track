import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createViewState, JBrowseApp } from "@jbrowse/react-app2";

import type { GeneViewerProps } from "./types";
import {
  queryGffRegion,
  queryGffRegionFromPlainGff,
  type GffFeature,
} from "./gff";
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

type ViewModel = ReturnType<typeof createViewState>;

export default function GeneViewer(props: GeneViewerProps) {
  const [viewState, setViewState] = useState<ViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [essentialityEnabled, setEssentialityEnabled] = useState<boolean>(
    !!props.essentiality?.enabled,
  );
  const [selectedGeneId, setSelectedGeneId] = useState<string | null>(
    props.initialSelection?.locusTag ?? null,
  );

  const [genesInView, setGenesInView] = useState<GffFeature[]>([]);
  const genesInViewRef = useRef<GffFeature[]>([]);
  genesInViewRef.current = genesInView;
  /** After a table click we skip syncing from session.selection for a short window so the poll doesn't overwrite back to the previous gene */
  const lastTableSelectionTimeRef = useRef<number>(0);
  /** Ensure we only navigate once per table click; otherwise session poll can change selectedFeature and trigger a second nav to a wrong place */
  const hasNavigatedThisTableClickRef = useRef<boolean>(false);
  /** Apply initial zoom once when view is ready so more than two genes are visible (showAllRegions). */
  const initialZoomAppliedRef = useRef<boolean>(false);
  const jbrowseContainerRef = useRef<HTMLDivElement>(null);

  const joinAttribute = props.essentiality?.featureJoinAttribute ?? "locus_tag";

  const gff = props.annotation.gff;
  const gffAdapterMode = gff.gffAdapterMode ?? "auto";
  const resolvedGffAdapterMode = useResolvedGffAdapterMode(
    gff.gffUrl,
    gffAdapterMode,
    gff.smallGffThresholdBytes ?? 256000,
  );

  // Resolve a clicked feature id (e.g. GFF ID or locus_tag) to the canonical locus_tag for selection/panel/table
  const resolveToLocusTag = useCallback(
    (featureId: string, features: GffFeature[]): string => {
      const norm = String(featureId).trim();
      if (!norm) return featureId;
      for (const f of features) {
        const attrs = f.attributes ?? {};
        const locus = String(
          attrs[joinAttribute] ??
            attrs.locus_tag ??
            f.locus_tag ??
            attrs.ID ??
            f.id ??
            "",
        ).trim();
        const id = String(attrs.ID ?? f.id ?? "").trim();
        if (norm === locus || norm === id) return locus || id || featureId;
      }
      return featureId;
    },
    [joinAttribute],
  );
  const genesInViewTypes = useMemo(
    () => props.ui?.genesInViewTypes ?? ["CDS"],
    [props.ui?.genesInViewTypes],
  );

  // Keep internal essentiality-enabled in sync with props changes
  useEffect(() => {
    setEssentialityEnabled(!!props.essentiality?.enabled);
  }, [props.essentiality?.enabled]);

  const { essentialityIndex, essentialityError } = useGeneViewerEssentiality({
    enabled: essentialityEnabled,
    csvUrl: props.essentiality?.csvUrl,
    csvJoinColumn: props.essentiality?.csvJoinColumn,
    csvStatusColumn: props.essentiality?.csvStatusColumn,
  });
  useEffect(() => {
    if (essentialityError) setError(essentialityError);
  }, [essentialityError]);

  // Compute visible region and query genes-in-view from GFF (must run before selectedFeature/selectedLocusTag)
  const visibleRegion = useJBrowseVisibleRegion(
    viewState,
    VISIBLE_REGION_POLL_MS,
  );
  const gffQueryAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
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
      } catch (e: any) {
        if (!token.cancelled) setError(e?.message ?? String(e));
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
      props.essentiality?.colorMap,
    );

  // Keep JEXL context up to date (selection + essentiality) so track highlight (blue bar) works.
  // useLayoutEffect so context is set before paint and before track re-render from reload().
  useLayoutEffect(() => {
    setGeneViewerJexlContext({
      selectedGeneId: selectedLocusTag ?? selectedGeneId,
      essentialityEnabled,
      essentialityIndex: essentialityIndex as any,
      essentialityColorMap: props.essentiality?.colorMap,
      featureJoinAttribute: joinAttribute,
      highlightColor: COLORS.highlight,
    });
  }, [
    selectedLocusTag,
    selectedGeneId,
    essentialityEnabled,
    essentialityIndex,
    joinAttribute,
    props.essentiality?.colorMap,
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
    selectedFeatures[0] ?? null,
    lastTableSelectionTimeRef,
    hasNavigatedThisTableClickRef,
  );

  const assemblyConfig = useMemo(() => buildAssemblyConfig(props), [props]);
  const tracksConfig = useMemo(
    () =>
      buildTracksConfig(props, {
        adapterMode: resolvedGffAdapterMode ?? "tabix",
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

  useEffect(() => {
    if (viewState) props.onViewStateReady?.(viewState);
  }, [viewState]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const showLegends = props.ui?.showLegends ?? true;
  const showPanel = props.ui?.showFeaturePanel ?? true;
  const showTable = props.ui?.showGenesInViewTable ?? true;

  const heightPx = props.heightPx ?? DEFAULT_VIEWER_HEIGHT_PX;

  useGeneViewerHideDrawer(viewState, jbrowseContainerRef);
  useGeneViewerResizeSync(viewState, jbrowseContainerRef);

  return (
    <div
      style={{
        width: "100%",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {showLegends ? (
        <GeneViewerLegends
          essentiality={props.essentiality}
          essentialityEnabled={essentialityEnabled}
          onToggleEssentiality={(next) => setEssentialityEnabled(next)}
        />
      ) : null}

      {error ? (
        <div
          style={{
            padding: 12,
            background: COLORS.errorBg,
            borderBottom: `1px solid ${COLORS.errorBorder}`,
            color: COLORS.errorText,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          padding: "4px 12px",
          fontSize: 11,
          color: COLORS.textMuted,
          background: COLORS.backgroundLight,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
        title="Shows current selection – click a gene in the track or a row in the table"
      >
        Selected: {selectedLocusTag ?? "—"} (genes in view: {genesInView.length}
        )
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showPanel
            ? `1fr ${FEATURE_PANEL_WIDTH_PX}px`
            : "1fr",
          width: "100%",
        }}
      >
        <div
          ref={jbrowseContainerRef}
          style={{
            width: "100%",
            minWidth: 0,
            minHeight: heightPx,
            maxHeight: heightPx,
            overflow: "hidden",
          }}
        >
          {viewState ? (
            <JBrowseApp viewState={viewState} />
          ) : (
            <div style={{ padding: 12, color: COLORS.textMuted }}>
              Loading JBrowse…
            </div>
          )}
        </div>

        {showPanel ? (
          <div
            style={{
              borderLeft: `1px solid ${COLORS.border}`,
              height: heightPx,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <FeaturePanel
              features={selectedFeatures}
              essentiality={selectedEssentiality}
            />
          </div>
        ) : null}
      </div>

      {showTable ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showPanel
              ? `1fr ${FEATURE_PANEL_WIDTH_PX}px`
              : "1fr",
          }}
        >
          <div>
            <GenesInViewTable
              features={genesInView}
              selectedId={selectedLocusTag}
              onSelect={(id) => {
                lastTableSelectionTimeRef.current = Date.now();
                hasNavigatedThisTableClickRef.current = false;
                if (typeof window !== "undefined") window.selectedGeneId = id;
                setSelectedGeneId(id);
              }}
              joinAttribute={joinAttribute}
            />
          </div>
          {showPanel ? <div /> : null}
        </div>
      ) : null}
    </div>
  );
}
