import Gff3Adapter from "@jbrowse/plugin-gff3/esm/Gff3Adapter/Gff3Adapter";
import { type Feature } from "@jbrowse/core/util/simpleFeature";
import type { Observable } from "rxjs";
export declare const configSchema: import("@jbrowse/core/configuration/configurationSchema").ConfigurationSchemaType<
  {
    essentialityCsvUrl: {
      type: string;
      defaultValue: string;
      description: string;
    };
    csvJoinColumn: {
      type: string;
      defaultValue: string;
    };
    csvStatusColumn: {
      type: string;
      defaultValue: string;
    };
    featureJoinAttribute: {
      type: string;
      defaultValue: string;
    };
  },
  import("@jbrowse/core/configuration/configurationSchema").ConfigurationSchemaOptions<
    import("@jbrowse/core/configuration/configurationSchema").ConfigurationSchemaType<
      {
        gffLocation: {
          type: string;
          defaultValue: {
            uri: string;
            locationType: string;
          };
        };
      },
      import("@jbrowse/core/configuration/configurationSchema").ConfigurationSchemaOptions<
        undefined,
        undefined
      >
    >,
    undefined
  >
>;
export default class Gff3WithEssentialityAdapter extends Gff3Adapter {
  static type: string;
  private essentialityIndex;
  private essentialityLoaded;
  private ensureEssentialityLoaded;
  getFeatures(query: any, opts?: any): Observable<Feature>;
}
