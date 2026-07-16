import Gff3TabixAdapter from "@jbrowse/plugin-gff3/esm/Gff3TabixAdapter/Gff3TabixAdapter";
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
        gffGzLocation: {
          type: string;
          defaultValue: {
            uri: string;
            locationType: string;
          };
        };
        index: import("@jbrowse/core/configuration/configurationSchema").ConfigurationSchemaType<
          {
            indexType: {
              model: import("mobx-state-tree").ISimpleType<string>;
              type: string;
              defaultValue: string;
            };
            location: {
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
        >;
        dontRedispatch: {
          type: string;
          defaultValue: string[];
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
export default class Gff3TabixWithEssentialityAdapter extends Gff3TabixAdapter {
  static type: string;
  private essentialityIndex;
  private essentialityLoaded;
  configure(opts?: any): Promise<{
    gff: TabixIndexedFile;
    dontRedispatch: string[];
  }>;
  getFeatures(query: any, opts?: any): Observable<Feature>;
}
