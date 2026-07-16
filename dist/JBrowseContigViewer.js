"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_app2_1 = require("@jbrowse/react-app2");
const makeWorkerInstance_1 = __importDefault(
  require("@jbrowse/react-app2/esm/makeWorkerInstance"),
);
require("@fontsource/roboto");
const assembly_1 = require("./components/GenomeViewer/assembly");
const defaultSessionConfig_1 = __importDefault(
  require("./components/GenomeViewer/defaultSessionConfig"),
);
const tracks_1 = __importDefault(require("./components/GenomeViewer/tracks"));
const JBrowseContigViewer = ({ genomeMeta, fileLocations }) => {
  const [viewState, setViewState] = (0, react_1.useState)(null);
  const assembly = (0, react_1.useMemo)(() => {
    return (0, assembly_1.getAssembly2)(genomeMeta, fileLocations);
  }, [genomeMeta, fileLocations]);
  const tracks = (0, react_1.useMemo)(() => {
    return (0, tracks_1.default)(genomeMeta, "");
  }, [genomeMeta]);
  const sessionConfig = (0, react_1.useMemo)(() => {
    return (0, defaultSessionConfig_1.default)(genomeMeta, assembly, tracks);
  }, [genomeMeta, assembly, tracks]);
  const config = (0, react_1.useMemo)(
    () => ({
      assemblies: [assembly],
      tracks: tracks.map((track) => ({
        ...track,
        visible: true,
      })),
      defaultSession: sessionConfig
        ? { ...sessionConfig, name: "defaultSession" }
        : undefined,
    }),
    [assembly, tracks, sessionConfig],
  );
  (0, react_1.useEffect)(() => {
    console.log("Initializing JBrowse");
    const state = (0, react_app2_1.createViewState)({
      config,
      makeWorkerInstance: makeWorkerInstance_1.default,
    });
    setViewState(state);
  }, [config]);
  if (!viewState) {
    return null;
  }
  return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
    children: [
      (0, jsx_runtime_1.jsx)("h1", {
        children: "JMGnify JBrowse Contig Viewer",
      }),
      (0, jsx_runtime_1.jsx)("div", {
        children: (0, jsx_runtime_1.jsx)(react_app2_1.JBrowseApp, {
          viewState: viewState,
        }),
      }),
    ],
  });
};
exports.default = JBrowseContigViewer;
