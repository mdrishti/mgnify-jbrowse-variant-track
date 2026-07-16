"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getTracks = (genomeMeta, gffBaseUrl) => {
  const tracks = [];
  // Structural Annotation Track
  tracks.push({
    type: "FeatureTrack",
    trackId: "structural_annotation",
    name: "structural_annotation",
    assemblyNames: [genomeMeta.assembly_name],
    category: ["Annotations"],
    adapter: {
      type: "Gff3TabixAdapter",
      gffGzLocation: {
        // uri: 'http://localhost:8080/ERZ1049444/ERZ1049444_FASTA_annotations.gff.bgz',
        uri: "http://localhost:8080/pub/databases/metagenomics/mgnify_results/PRJNA398/PRJNA398089/SRR1111/SRR1111111/V6/assembly/ERZ1049444_FASTA_annotations.gff.bgz",
      },
      index: {
        location: {
          // uri: 'http://localhost:8080/ERZ1049444/ERZ1049444_FASTA_annotations.gff.bgz.tbi',
          uri: "http://localhost:8080/pub/databases/metagenomics/mgnify_results/PRJNA398/PRJNA398089/SRR1111/SRR1111111/V6/assembly/ERZ1049444_FASTA_annotations.gff.bgz.tbi",
        },
      },
    },
    textSearching: {
      textSearchAdapter: {
        type: "TrixTextSearchAdapter",
        textSearchAdapterId: "gff3tabix_genes-index",
        trackId: "structural_annotation",
        ixFilePath: {
          uri: "http://localhost:8080/ERZ1049444/trix/ERZ1049444_FASTA_annotations.gff.bgz.ix",
        },
        ixxFilePath: {
          uri: "http://localhost:8080/ERZ1049444/trix/ERZ1049444_FASTA_annotations.gff.bgz.ixx",
        },
        metaFilePath: {
          uri: "http://localhost:8080/ERZ1049444/trix/ERZ1049444_FASTA_annotations.gff.bgz_meta.json",
        },
        assemblyNames: [genomeMeta.assembly_name],
      },
    },
    displays: [
      {
        displayId: "customTrack-LinearBasicDisplay",
        type: "LinearBasicDisplay",
        rendererTypeName: "SvgFeatureRenderer",
        renderer: {
          type: "SvgFeatureRenderer",
        },
        height: 280,
      },
    ],
    visible: true,
  });
  return tracks;
};
exports.default = getTracks;
