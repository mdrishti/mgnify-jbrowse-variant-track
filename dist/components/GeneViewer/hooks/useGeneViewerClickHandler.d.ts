import React from "react";
import type { GffFeature } from "../gff";
export declare function useGeneViewerClickHandler(opts: {
  viewState: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  genesInViewRef: React.MutableRefObject<GffFeature[]>;
  lastTableSelectionTimeRef: React.MutableRefObject<number>;
  setSelectedGeneId: (v: string) => void;
  resolveToLocusTag: (id: string, features: GffFeature[]) => string;
  joinAttribute: string;
}): void;
