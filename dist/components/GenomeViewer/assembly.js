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
      fastaLocation: {
        // uri: 'http://localhost:8080/ERZ1049444/ERZ1049444_FASTA.fasta.gz',
        uri: fileLocations.fasta,
      },
      faiLocation: {
        // uri: 'http://localhost:8080/ERZ1049444/ERZ1049444_FASTA.fasta.gz.fai',
        uri: fileLocations.fai,
      },
      gziLocation: {
        // uri: 'http://localhost:8080/ERZ1049444/ERZ1049444_FASTA.fasta.gz.gzi',
        uri: fileLocations.gzi,
      },
    },
  },
});
exports.getAssembly2 = getAssembly2;
