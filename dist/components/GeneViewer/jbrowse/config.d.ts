import type { GeneViewerProps, GffAdapterMode } from "../types";
export declare function buildAssemblyConfig(props: GeneViewerProps): {
  name: string;
  sequence: {
    type: string;
    trackId: string;
    adapter: {
      type: string;
      fastaLocation: {
        uri: string;
      };
      faiLocation: {
        uri: string;
      };
      gziLocation: {
        uri: string;
      };
    };
  };
};
export declare function buildTracksConfig(
  props: GeneViewerProps,
  opts?: {
    adapterMode?: GffAdapterMode;
  },
): any[];
export declare function buildDefaultSessionConfig(opts: {
  assemblyName: string;
  initialRefName: string;
  initialEnd: number;
  initialStart?: number;
  /** Pass the gene track from buildTracksConfig so session uses same displays (with JEXL color1/labels). Like METT: displays: track.displays */
  geneTrackConfig?: {
    trackId: string;
    type: string;
    displays: any[];
  };
  variantTrackConfig?: {
    trackId: string;
    type: string;
    displays: any[];
  };
}): {
  name: string;
  widgets: {
    BaseFeatureWidget: {
      type: string;
      disabled: boolean;
    };
  };
  views: {
    type: string;
    configuration: {
      header: {
        disable: boolean;
        hidden: boolean;
      };
    };
    displayedRegions: {
      refName: string;
      start: number;
      end: number;
      assemblyName: string;
    }[];
    tracks: any[];
  }[];
};
