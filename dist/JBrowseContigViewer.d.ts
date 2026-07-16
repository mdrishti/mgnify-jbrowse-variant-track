import React from "react";
import "@fontsource/roboto";
import { GenomeMeta } from "./interfaces/Genome";
export interface JBrowseContigViewerProps {
  genomeMeta: GenomeMeta;
  fileLocations: {
    fasta: string;
    fai: string;
    gzi: string;
  };
}
declare const JBrowseContigViewer: React.FC<JBrowseContigViewerProps>;
export default JBrowseContigViewer;
