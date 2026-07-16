"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssembly2 = void 0;
const getAssembly2 = (genomeMeta, fileLocations) => ({
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
exports.getAssembly2 = getAssembly2;
