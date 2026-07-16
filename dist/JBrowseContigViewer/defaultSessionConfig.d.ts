import type { GenomeMeta } from "./types";
declare const getDefaultSessionConfig: (
  genomeMeta: GenomeMeta | null,
  assembly: any,
  tracks: any[],
) => {
  name: string;
  views: {
    type: string;
    displayedRegions: {
      refName: string;
      start: number;
      end: number;
      assemblyName: string;
    }[];
    tracks: (
      | {
          type: string;
          configuration: string;
          minimized: boolean;
          displays: {
            id: string;
            type: string;
            height: number;
            showForward: boolean;
            showReverse: boolean;
            showTranslation: boolean;
            showLabels: boolean;
          }[];
        }
      | {
          type: string;
          configuration: string;
          displays: {
            id: string;
            type: string;
            rendererTypeName: string;
            renderer: {
              type: string;
            };
            height: number;
          }[];
          minimized?: undefined;
        }
    )[];
  }[];
} | null;
export default getDefaultSessionConfig;
