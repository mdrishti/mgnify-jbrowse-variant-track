import {
  jsx as _jsx,
  Fragment as _Fragment,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createViewState, JBrowseApp } from "@jbrowse/react-app2";
import makeWorkerInstance from "@jbrowse/react-app2/esm/makeWorkerInstance";
import "@fontsource/roboto";
import { getAssembly2 } from "./assembly";
import getDefaultSessionConfig from "./defaultSessionConfig";
import getTracks from "./tracks";
const JBrowseContigViewer = ({ genomeMeta, fileLocations }) => {
  const [viewState, setViewState] = useState(null);
  const assembly = useMemo(
    () => getAssembly2(genomeMeta, fileLocations),
    [genomeMeta, fileLocations],
  );
  const tracks = useMemo(
    () => getTracks(genomeMeta, fileLocations),
    [genomeMeta, fileLocations],
  );
  const sessionConfig = useMemo(
    () => getDefaultSessionConfig(genomeMeta, assembly, tracks),
    [genomeMeta, assembly, tracks],
  );
  const config = useMemo(
    () => ({
      assemblies: [assembly],
      tracks: tracks.map((track) => ({ ...track, visible: true })),
      defaultSession: sessionConfig
        ? { ...sessionConfig, name: "defaultSession" }
        : undefined,
    }),
    [assembly, tracks, sessionConfig],
  );
  useEffect(() => {
    console.log("Initializing JBrowse");
    const state = createViewState({ config, makeWorkerInstance });
    setViewState(state);
  }, [config]);
  if (!viewState) return null;
  return _jsxs(_Fragment, {
    children: [
      _jsx("h1", { children: "JMGnify JBrowse Contig Viewer" }),
      _jsx("div", { children: _jsx(JBrowseApp, { viewState: viewState }) }),
    ],
  });
};
export default JBrowseContigViewer;
