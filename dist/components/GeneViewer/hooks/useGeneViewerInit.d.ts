/// <reference types="react" />
import { createViewState } from "@jbrowse/react-app2";
import type { GeneViewerProps } from "../types";
type ViewModel = ReturnType<typeof createViewState>;
export declare function useGeneViewerInit(
  props: GeneViewerProps,
  assemblyConfig: any,
  tracksConfig: any[],
  setViewState: (v: ViewModel | null) => void,
  setError: (v: string | null) => void,
  initialZoomAppliedRef: React.MutableRefObject<boolean>,
  initReady?: boolean,
): void;
export {};
