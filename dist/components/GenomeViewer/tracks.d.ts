import { GenomeMeta } from "../../interfaces/Genome";
declare const getTracks: (
  genomeMeta: GenomeMeta,
  gffBaseUrl: string,
) => {
  type: string;
  trackId: string;
  name: string;
  assemblyNames: string[];
  category: string[];
  adapter: {
    type: string;
    gffGzLocation: {
      uri: string;
    };
    index: {
      location: {
        uri: string;
      };
    };
  };
  textSearching: {
    textSearchAdapter: {
      type: string;
      textSearchAdapterId: string;
      trackId: string;
      ixFilePath: {
        uri: string;
      };
      ixxFilePath: {
        uri: string;
      };
      metaFilePath: {
        uri: string;
      };
      assemblyNames: string[];
    };
  };
  displays: {
    displayId: string;
    type: string;
    rendererTypeName: string;
    renderer: {
      type: string;
    };
    height: number;
  }[];
  visible: boolean;
}[];
export default getTracks;
