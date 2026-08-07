import type { AnnotationTrack, GenomeMeta } from "./types";

const getTracks = (
  genomeMeta: GenomeMeta,
  annotationTracks: AnnotationTrack[],
) =>
  annotationTracks.map((t) => {
    const track: any = {
      type: "FeatureTrack",
      trackId: t.id,
      name: t.label,
      assemblyNames: [genomeMeta.assembly_name],
      category: t.category,
      adapter: {
        type: "Gff3TabixAdapter",
        gffGzLocation: { uri: t.gffUrl },
        index: {
          indexType: "CSI" as const,
          location: { uri: t.csiUrl },
        },
      },
      displays: [
        {
          displayId: `${t.id}-LinearBasicDisplay`,
          type: "LinearBasicDisplay",
          rendererTypeName: "SvgFeatureRenderer",
          renderer: { type: "SvgFeatureRenderer" },
          height: 280,
        },
      ],
      visible: true,
    };
    if (t.ixUrl && t.ixxUrl) {
      track.textSearching = {
        textSearchAdapter: {
          type: "TrixTextSearchAdapter",
          textSearchAdapterId: `${t.id}-index`,
          trackId: t.id,
          ixFilePath: { uri: t.ixUrl },
          ixxFilePath: { uri: t.ixxUrl },
          ...(t.metaUrl ? { metaFilePath: { uri: t.metaUrl } } : {}),
          assemblyNames: [genomeMeta.assembly_name],
        },
      };
    }
    return track;
  });

export default getTracks;
