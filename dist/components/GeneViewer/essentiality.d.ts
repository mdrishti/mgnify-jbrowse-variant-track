import type { EssentialityColorMap, EssentialityStatus } from "./types";
export declare const DEFAULT_ESSENTIALITY_COLOR_MAP: EssentialityColorMap;
export declare function normalizeEssentialityStatus(
  input: unknown,
): EssentialityStatus;
export declare function getColorForEssentiality(
  status: EssentialityStatus,
  colorMap?: EssentialityColorMap,
): string;
export declare function getIconForEssentiality(
  status: EssentialityStatus,
): string;
/**
 * Minimal CSV parser that supports commas, newlines, and double-quoted fields.
 * Suitable for typical "flat" CSVs; does not support multi-line quoted fields.
 */
export declare function parseCsv(text: string): string[][];
export interface EssentialityCsvRow {
  joinKey: string;
  status: EssentialityStatus;
  raw: Record<string, string>;
}
export declare function buildEssentialityIndexFromCsv(
  csvText: string,
  opts?: {
    joinColumn?: string;
    statusColumn?: string;
  },
): Map<string, EssentialityCsvRow>;
