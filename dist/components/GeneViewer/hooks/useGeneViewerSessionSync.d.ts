/// <reference types="react" />
export declare function useGeneViewerSessionSync(opts: {
  viewState: any;
  lastTableSelectionTimeRef: React.MutableRefObject<number>;
  setSelectedGeneId: (
    v: string | null | ((prev: string | null) => string | null),
  ) => void;
  joinAttr: string;
}): void;
