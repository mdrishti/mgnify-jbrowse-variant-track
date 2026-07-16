export interface FaiRefInfo {
  refName: string;
  length: number;
}
export declare function fetchFirstFaiRef(faiUrl: string): Promise<FaiRefInfo>;
export interface GffFeature {
  refName: string;
  start: number;
  end: number;
  strand: 1 | -1 | 0;
  type: string;
  source: string;
  score?: string;
  phase?: string;
  attributes: Record<string, string>;
  /** Convenience IDs (may be missing depending on GFF) */
  id?: string;
  locus_tag?: string;
}
export declare function queryGffRegion(opts: {
  gffUrl: string;
  /** CSI index URL (.csi) */
  csiUrl: string;
  refName: string;
  start: number;
  end: number;
  featureTypes?: string[];
}): Promise<GffFeature[]>;
/** Fetch Content-Length via HEAD. Returns null if unavailable. */
export declare function fetchGffContentLength(
  gffUrl: string,
): Promise<number | null>;
/** Fetch whole GFF, parse, and filter by region. Use for small GFFs when tabix would hit 416. */
export declare function queryGffRegionFromPlainGff(opts: {
  gffUrl: string;
  refName: string;
  start: number;
  end: number;
  featureTypes?: string[];
}): Promise<GffFeature[]>;
