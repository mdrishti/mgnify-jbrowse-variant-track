import type { GenomeMeta } from "./types";
declare const getTracks: (
  genomeMeta: GenomeMeta,
  fileLocations: {
    gff: string;
    csi: string;
    ix?: string;
    ixx?: string;
    meta?: string;
  },
) => any[];
export default getTracks;
