import type { EssentialityColorMap, EssentialityStatus } from "./types";

export const DEFAULT_ESSENTIALITY_COLOR_MAP: EssentialityColorMap = {
  essential: "#FF0000",
  essential_liquid: "rgb(8,188,152)",
  essential_solid: "#8B4513",
  not_essential: "#555555",
  unclear: "#808080",
  unknown: "#DAA520",
};

export function normalizeEssentialityStatus(
  input: unknown,
): EssentialityStatus {
  const raw = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  switch (raw) {
    case "essential":
      return "essential";
    case "essential_liquid":
      return "essential_liquid";
    case "essential_solid":
      return "essential_solid";
    case "not_essential":
    case "non_essential":
    case "non-essential":
      return "not_essential";
    case "unclear":
    case "unknown":
    case "":
      return "unknown";
    default:
      return raw as EssentialityStatus;
  }
}

export function getColorForEssentiality(
  status: EssentialityStatus,
  colorMap?: EssentialityColorMap,
): string {
  const map = { ...DEFAULT_ESSENTIALITY_COLOR_MAP, ...(colorMap ?? {}) };
  return map[status] ?? map.unknown ?? DEFAULT_ESSENTIALITY_COLOR_MAP.unknown!;
}

export function getIconForEssentiality(status: EssentialityStatus): string {
  switch (status) {
    case "essential":
      return "🧪🧫";
    case "essential_liquid":
      return "🧪";
    case "essential_solid":
      return "🧫";
    case "not_essential":
      return "⛔";
    case "unclear":
    case "unknown":
    default:
      return "❓";
  }
}

/**
 * Minimal CSV parser that supports commas, newlines, and double-quoted fields.
 * Suitable for typical "flat" CSVs; does not support multi-line quoted fields.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];

    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // escaped quote
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur);
    rows.push(row.map((c) => c.trim()));
  }

  return rows;
}

export interface EssentialityCsvRow {
  joinKey: string;
  status: EssentialityStatus;
  raw: Record<string, string>;
}

export function buildEssentialityIndexFromCsv(
  csvText: string,
  opts?: {
    joinColumn?: string;
    statusColumn?: string;
  },
): Map<string, EssentialityCsvRow> {
  const joinColumn = opts?.joinColumn ?? "locus_tag";
  const statusColumn = opts?.statusColumn ?? "essentiality";

  const rows = parseCsv(csvText);
  if (rows.length === 0) return new Map();

  const header = rows[0].map((h) => h.trim());
  const joinIdx = header.indexOf(joinColumn);
  const statusIdx = header.indexOf(statusColumn);

  if (joinIdx === -1) {
    throw new Error(`Essentiality CSV missing join column "${joinColumn}"`);
  }
  if (statusIdx === -1) {
    throw new Error(`Essentiality CSV missing status column "${statusColumn}"`);
  }

  const index = new Map<string, EssentialityCsvRow>();

  for (const row of rows.slice(1)) {
    const joinKey = (row[joinIdx] ?? "").trim();
    if (!joinKey) continue;

    const rawStatus = row[statusIdx] ?? "";
    const status = normalizeEssentialityStatus(rawStatus);

    const raw: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      raw[header[i]] = row[i] ?? "";
    }

    index.set(joinKey, { joinKey, status, raw });
  }

  return index;
}
