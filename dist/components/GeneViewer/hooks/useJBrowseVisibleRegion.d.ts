export interface VisibleRegion {
  refName: string;
  start: number;
  end: number;
  assemblyName?: string;
}
export declare function useJBrowseVisibleRegion(
  viewState: any,
  pollingMs?: number,
): VisibleRegion | null;
