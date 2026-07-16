import type { GffFeature } from "../gff";
export declare function GenesInViewTable(props: {
  features: GffFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  joinAttribute: string;
}): import("react/jsx-runtime").JSX.Element;
