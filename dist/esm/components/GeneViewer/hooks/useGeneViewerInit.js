import { useEffect } from "react";
import { createViewState } from "@jbrowse/react-app2";
import makeWorkerInstance from "@jbrowse/react-app2/esm/makeWorkerInstance";
import VariantsPlugin from "@jbrowse/plugin-variants";
import GeneViewerJBrowsePlugin from "../jbrowse/plugin";
import { buildDefaultSessionConfig } from "../jbrowse/config";
import { fetchFirstFaiRef } from "../gff";
import { parseInitialLocation } from "../utils/parseUtils";
export function useGeneViewerInit(
  props,
  assemblyConfig,
  tracksConfig,
  setViewState,
  setError,
  initialZoomAppliedRef,
  initReady = true,
) {
  useEffect(() => {
    if (!initReady) return;
    initialZoomAppliedRef.current = false;
    let cancelled = false;
    async function init() {
      var _a;
      try {
        setError(null);
        const initialLoc = props.initialLocation
          ? parseInitialLocation(props.initialLocation)
          : null;
        let initialRefName;
        let initialStart = 0;
        let initialEnd;
        if (initialLoc) {
          initialRefName = initialLoc.refName;
          initialStart = initialLoc.start;
          initialEnd = initialLoc.end;
        } else {
          const first = await fetchFirstFaiRef(props.assembly.fasta.faiUrl);
          initialRefName = first.refName;
          initialEnd =
            props.initialRegionBp != null
              ? Math.min(first.length, props.initialRegionBp)
              : first.length;
        }
        const geneTrack = tracksConfig.find(
          (t) => t.trackId === "gene_features",
        );
        const variantTrack = tracksConfig.find((t) => t.trackId === "variants");
        const sessionConfig = buildDefaultSessionConfig({
          assemblyName: props.assembly.name,
          initialRefName,
          initialStart,
          initialEnd,
          geneTrackConfig: geneTrack,
          variantTrackConfig: variantTrack,
        });
        const config = {
          assemblies: [assemblyConfig],
          tracks: tracksConfig.map((t) => ({ ...t, visible: true })),
          defaultSession: { ...sessionConfig, name: "defaultSession" },
        };
        const plugins = variantTrack
          ? [GeneViewerJBrowsePlugin, VariantsPlugin]
          : [GeneViewerJBrowsePlugin];
        const state = createViewState({
          config,
          plugins,
          makeWorkerInstance,
        });
        try {
          const session = state.session;
          if (session) {
            session.showWidget = function () {
              return undefined;
            };
            session.addWidget = function () {
              return undefined;
            };
          }
        } catch (_) {
          // ignore
        }
        if (!cancelled) setViewState(state);
      } catch (e) {
        if (!cancelled)
          setError(
            (_a = e === null || e === void 0 ? void 0 : e.message) !== null &&
              _a !== void 0
              ? _a
              : String(e),
          );
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [
    initReady,
    props.initialLocation,
    props.initialRegionBp,
    props.assembly.fasta.faiUrl,
    props.assembly.name,
    assemblyConfig,
    tracksConfig,
  ]);
}
