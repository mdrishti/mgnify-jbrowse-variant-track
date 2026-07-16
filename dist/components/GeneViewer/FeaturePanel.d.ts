import type { GffFeature } from "./gff";
export declare function FeaturePanel(props: {
  feature: GffFeature | null;
  essentiality?: {
    status: string;
    color: string;
    icon: string;
  } | null;
}): import("react/jsx-runtime").JSX.Element;
