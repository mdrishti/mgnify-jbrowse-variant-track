const getTracks = (genomeMeta, fileLocations) => {
  const { gff, csi, ix, ixx, meta } = fileLocations;
  const track = {
    type: "FeatureTrack",
    trackId: "structural_annotation",
    name: "structural_annotation",
    assemblyNames: [genomeMeta.assembly_name],
    category: ["Annotations"],
    adapter: {
      type: "Gff3TabixAdapter",
      gffGzLocation: { uri: gff },
      index: {
        indexType: "CSI",
        location: { uri: csi },
      },
    },
    displays: [
      {
        displayId: "customTrack-LinearBasicDisplay",
        type: "LinearBasicDisplay",
        rendererTypeName: "SvgFeatureRenderer",
        renderer: { type: "SvgFeatureRenderer" },
        height: 280,
      },
    ],
    visible: true,
  };
  if (ix && ixx) {
    track.textSearching = {
      textSearchAdapter: {
        type: "TrixTextSearchAdapter",
        textSearchAdapterId: "gff3tabix_genes-index",
        trackId: "structural_annotation",
        ixFilePath: { uri: ix },
        ixxFilePath: { uri: ixx },
        ...(meta ? { metaFilePath: { uri: meta } } : {}),
        assemblyNames: [genomeMeta.assembly_name],
      },
    };
  }
  return [track];
};
export default getTracks;
