"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeneViewerInit = void 0;
const react_1 = require("react");
const react_app2_1 = require("@jbrowse/react-app2");
const makeWorkerInstance_1 = __importDefault(
  require("@jbrowse/react-app2/esm/makeWorkerInstance"),
);
const plugin_variants_1 = __importDefault(require("@jbrowse/plugin-variants"));
const plugin_1 = __importDefault(require("../jbrowse/plugin"));
const config_1 = require("../jbrowse/config");
const gff_1 = require("../gff");
const parseUtils_1 = require("../utils/parseUtils");
function useGeneViewerInit(
  props,
  assemblyConfig,
  tracksConfig,
  setViewState,
  setError,
  initialZoomAppliedRef,
  initReady = true,
) {
  (0, react_1.useEffect)(() => {
    if (!initReady) return;
    initialZoomAppliedRef.current = false;
    let cancelled = false;
    async function init() {
      var _a;
      try {
        setError(null);
        const initialLoc = props.initialLocation
          ? (0, parseUtils_1.parseInitialLocation)(props.initialLocation)
          : null;
        let initialRefName;
        let initialStart = 0;
        let initialEnd;
        if (initialLoc) {
          initialRefName = initialLoc.refName;
          initialStart = initialLoc.start;
          initialEnd = initialLoc.end;
        } else {
          const first = await (0, gff_1.fetchFirstFaiRef)(
            props.assembly.fasta.faiUrl,
          );
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
        const sessionConfig = (0, config_1.buildDefaultSessionConfig)({
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
          ? [plugin_1.default, plugin_variants_1.default]
          : [plugin_1.default];
        const state = (0, react_app2_1.createViewState)({
          config,
          plugins,
          makeWorkerInstance: makeWorkerInstance_1.default,
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
exports.useGeneViewerInit = useGeneViewerInit;
