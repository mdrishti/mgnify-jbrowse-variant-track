import type { GenomeMeta } from "./types";

export const getAssembly2 = (
  genomeMeta: GenomeMeta,
  fileLocations: { gzi: string; fai: string; fasta: string },
) => ({
  name: genomeMeta.assembly_name,
  sequence: {
    type: "ReferenceSequenceTrack",
    trackId: "ReferenceSequenceTrack",
    adapter: {
      type: "BgzipFastaAdapter",
      fastaLocation: { uri: fileLocations.fasta },
      faiLocation: { uri: fileLocations.fai },
      gziLocation: { uri: fileLocations.gzi },
    },
  },
});
