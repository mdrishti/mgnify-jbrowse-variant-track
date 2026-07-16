export declare function useGeneViewerEssentiality(opts: {
  enabled: boolean;
  csvUrl?: string;
  csvJoinColumn?: string;
  csvStatusColumn?: string;
}): {
  essentialityIndex: Map<string, any>;
  essentialityError: string | null;
};
