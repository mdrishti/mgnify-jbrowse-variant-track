import type { GffAdapterMode } from "../types";
export declare function useResolvedGffAdapterMode(
  gffUrl: string,
  gffAdapterMode?: GffAdapterMode,
  smallGffThresholdBytes?: number,
): "tabix" | "plain" | null;
