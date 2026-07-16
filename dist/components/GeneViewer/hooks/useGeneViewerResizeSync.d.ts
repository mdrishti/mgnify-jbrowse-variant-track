/// <reference types="react" />
/** Sync JBrowse view width with container when it mounts or resizes. Fixes half-width layout when container size changes. */
export declare function useGeneViewerResizeSync(
  viewState: any,
  containerRef: React.RefObject<HTMLDivElement | null>,
): void;
