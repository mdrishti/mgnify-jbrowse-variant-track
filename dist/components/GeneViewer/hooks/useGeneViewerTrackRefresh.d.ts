/** Force track re-render when selection or essentiality changes so JEXL (getGeneColor) runs again. */
export declare function useGeneViewerTrackRefresh(
  viewState: any,
  selectedLocusTag: string | null,
  selectedGeneId: string | null,
  essentialityIndex: Map<string, string>,
  essentialityEnabled: boolean,
): void;
