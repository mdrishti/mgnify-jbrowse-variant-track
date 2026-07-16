/// <reference types="react" />
import type { GffFeature } from "../gff";
/** When user selects a gene from the table, center that gene in the current view. Runs once per table click. */
export declare function useGeneViewerTableNav(
  viewState: any,
  selectedFeature: GffFeature | null,
  lastTableSelectionTimeRef: React.MutableRefObject<number>,
  hasNavigatedThisTableClickRef: React.MutableRefObject<boolean>,
): void;
