import type { GffFeature } from "../gff";
import type { EssentialityColorMap } from "../types";
export declare function useGeneViewerSelection(
  selectedGeneId: string | null,
  genesInView: GffFeature[],
  joinAttribute: string,
  essentialityEnabled: boolean,
  essentialityIndex: Map<string, string>,
  essentialityColorMap?: EssentialityColorMap,
): {
  selectedFeatures: GffFeature[];
  selectedLocusTag: string | null;
  selectedEssentiality: {
    status: import("../types").EssentialityStatus;
    color: string;
    icon: string;
  } | null;
};
