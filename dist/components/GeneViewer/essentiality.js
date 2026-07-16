"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEssentialityIndexFromCsv =
  exports.parseCsv =
  exports.getIconForEssentiality =
  exports.getColorForEssentiality =
  exports.normalizeEssentialityStatus =
  exports.DEFAULT_ESSENTIALITY_COLOR_MAP =
    void 0;
exports.DEFAULT_ESSENTIALITY_COLOR_MAP = {
  essential: "#FF0000",
  essential_liquid: "rgb(8,188,152)",
  essential_solid: "#8B4513",
  not_essential: "#555555",
  unclear: "#808080",
  unknown: "#DAA520",
};
function normalizeEssentialityStatus(input) {
  const raw = String(input !== null && input !== void 0 ? input : "")
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
      return raw;
  }
}
exports.normalizeEssentialityStatus = normalizeEssentialityStatus;
function getColorForEssentiality(status, colorMap) {
  var _a, _b;
  const map = {
    ...exports.DEFAULT_ESSENTIALITY_COLOR_MAP,
    ...(colorMap !== null && colorMap !== void 0 ? colorMap : {}),
  };
  return (_b =
    (_a = map[status]) !== null && _a !== void 0 ? _a : map.unknown) !== null &&
    _b !== void 0
    ? _b
    : exports.DEFAULT_ESSENTIALITY_COLOR_MAP.unknown;
}
exports.getColorForEssentiality = getColorForEssentiality;
function getIconForEssentiality(status) {
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
exports.getIconForEssentiality = getIconForEssentiality;
/**
 * Minimal CSV parser that supports commas, newlines, and double-quoted fields.
 * Suitable for typical "flat" CSVs; does not support multi-line quoted fields.
 */
function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
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
exports.parseCsv = parseCsv;
function buildEssentialityIndexFromCsv(csvText, opts) {
  var _a, _b, _c, _d, _e;
  const joinColumn =
    (_a = opts === null || opts === void 0 ? void 0 : opts.joinColumn) !==
      null && _a !== void 0
      ? _a
      : "locus_tag";
  const statusColumn =
    (_b = opts === null || opts === void 0 ? void 0 : opts.statusColumn) !==
      null && _b !== void 0
      ? _b
      : "essentiality";
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
  const index = new Map();
  for (const row of rows.slice(1)) {
    const joinKey = (
      (_c = row[joinIdx]) !== null && _c !== void 0 ? _c : ""
    ).trim();
    if (!joinKey) continue;
    const rawStatus = (_d = row[statusIdx]) !== null && _d !== void 0 ? _d : "";
    const status = normalizeEssentialityStatus(rawStatus);
    const raw = {};
    for (let i = 0; i < header.length; i++) {
      raw[header[i]] = (_e = row[i]) !== null && _e !== void 0 ? _e : "";
    }
    index.set(joinKey, { joinKey, status, raw });
  }
  return index;
}
exports.buildEssentialityIndexFromCsv = buildEssentialityIndexFromCsv;
