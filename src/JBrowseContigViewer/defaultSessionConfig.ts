import type { GenomeMeta } from "./types";

const getDefaultSessionConfig = (
  genomeMeta: GenomeMeta | null,
  assembly: any,
  tracks: any[],
) => {
  if (!genomeMeta) {
    console.log("Genome meta information not found");
    return null;
  }
  return {
    name: "New session",
    views: [
      {
        type: "LinearGenomeView",
        displayedRegions: [
          {
            refName: "ERZ1049444.1-NODE-1-length-411323-cov-24.763004",
            start: 0,
            end: 400000,
            assemblyName: genomeMeta.assembly_name,
          },
        ],
        tracks: [
          {
            type: "ReferenceSequenceTrack",
            configuration: "ReferenceSequenceTrack",
            minimized: false,
            displays: [
              {
                id: "ReferenceSequenceTrack",
                type: "LinearReferenceSequenceDisplay",
                height: 280,
                showForward: true,
                showReverse: true,
                showTranslation: true,
                showLabels: true,
              },
            ],
          },
          ...tracks.map((t) => ({
            type: "FeatureTrack",
            configuration: t.trackId,
            displays: [
              {
                id: `${t.trackId}-LinearBasicDisplay`,
                type: "LinearBasicDisplay",
                rendererTypeName: "SvgFeatureRenderer",
                renderer: { type: "SvgFeatureRenderer" },
                height: 280,
              },
            ],
          })),
        ],
      },
    ],
  };
};

export default getDefaultSessionConfig;
