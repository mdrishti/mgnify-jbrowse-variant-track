import React from "react";
import "@fontsource/roboto";
import type { GenomeMeta } from "./types";
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
declare const JBrowseContigViewer: React.FC<JBrowseContigViewerProps>;
export default JBrowseContigViewer;
