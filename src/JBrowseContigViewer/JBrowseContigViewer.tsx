import React, { useEffect, useMemo, useState } from "react";
import { createViewState, JBrowseApp } from "@jbrowse/react-app2";
import makeWorkerInstance from "@jbrowse/react-app2/esm/makeWorkerInstance";
import "@fontsource/roboto";
import { getAssembly2 } from "./assembly";
import getDefaultSessionConfig from "./defaultSessionConfig";
import getTracks from "./tracks";
import type { GenomeMeta } from "./types";

type ViewModel = ReturnType<typeof createViewState>;

export interface JBrowseContigViewerProps {
  genomeMeta: GenomeMeta;
  fileLocations: {
    fasta: string;
    fai: string;
    gzi: string;
    gff: string;
    csi: string;
    /** Optional trix text search indexes */
    ix?: string;
    ixx?: string;
    meta?: string;
  };
}

const JBrowseContigViewer: React.FC<JBrowseContigViewerProps> = ({
  genomeMeta,
  fileLocations,
}) => {
  const [viewState, setViewState] = useState<ViewModel | null>(null);
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

  return (
    <>
      <h1>JMGnify JBrowse Contig Viewer</h1>
      <div>
        <JBrowseApp viewState={viewState} />
      </div>
    </>
  );
};

export default JBrowseContigViewer;
