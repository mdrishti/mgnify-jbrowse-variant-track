import {
  normalizeEssentialityStatus,
  getColorForEssentiality,
  getIconForEssentiality,
  parseCsv,
  buildEssentialityIndexFromCsv,
  DEFAULT_ESSENTIALITY_COLOR_MAP,
} from "./essentiality";

describe("normalizeEssentialityStatus", () => {
  it('normalizes "essential"', () => {
    expect(normalizeEssentialityStatus("essential")).toBe("essential");
    expect(normalizeEssentialityStatus("ESSENTIAL")).toBe("essential");
  });

  it('normalizes "not_essential" variants', () => {
    expect(normalizeEssentialityStatus("not_essential")).toBe("not_essential");
    expect(normalizeEssentialityStatus("non-essential")).toBe("not_essential");
    expect(normalizeEssentialityStatus("non_essential")).toBe("not_essential");
  });

  it("normalizes empty and unknown to unknown", () => {
    expect(normalizeEssentialityStatus("")).toBe("unknown");
    expect(normalizeEssentialityStatus("unknown")).toBe("unknown");
    expect(normalizeEssentialityStatus("  ")).toBe("unknown");
  });

  it("trims and lowercases", () => {
    expect(normalizeEssentialityStatus("  ESSENTIAL  ")).toBe("essential");
  });
});

describe("getColorForEssentiality", () => {
  it("returns default color for essential", () => {
    expect(getColorForEssentiality("essential")).toBe("#FF0000");
  });

  it("returns default color for unknown", () => {
    expect(getColorForEssentiality("unknown")).toBe(
      DEFAULT_ESSENTIALITY_COLOR_MAP.unknown,
    );
  });

  it("uses custom colorMap when provided", () => {
    expect(getColorForEssentiality("essential", { essential: "#00ff00" })).toBe(
      "#00ff00",
    );
  });
});

describe("getIconForEssentiality", () => {
  it("returns icons for known statuses", () => {
    expect(getIconForEssentiality("essential")).toBe("🧪🧫");
    expect(getIconForEssentiality("not_essential")).toBe("⛔");
    expect(getIconForEssentiality("unknown")).toBe("❓");
  });
});

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const result = parseCsv("a,b,c\n1,2,3");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCsv('a,"b,c",d\n1,"2,3",4');
    expect(result[1][1]).toBe("2,3");
  });

  it("skips empty lines", () => {
    const result = parseCsv("a,b\n\n1,2\n\n");
    expect(result).toHaveLength(2);
  });
});

describe("buildEssentialityIndexFromCsv", () => {
  it("builds index from CSV with default columns", () => {
    const csv = `locus_tag,essentiality
BU_001,essential
BU_002,not_essential`;
    const index = buildEssentialityIndexFromCsv(csv);
    expect(index.get("BU_001")?.status).toBe("essential");
    expect(index.get("BU_002")?.status).toBe("not_essential");
  });

  it("throws when join column is missing", () => {
    const csv = `wrong_col,essentiality\nBU_001,essential`;
    expect(() => buildEssentialityIndexFromCsv(csv)).toThrow(
      "missing join column",
    );
  });

  it("throws when status column is missing", () => {
    const csv = `locus_tag,wrong_col\nBU_001,essential`;
    expect(() => buildEssentialityIndexFromCsv(csv)).toThrow(
      "missing status column",
    );
  });
});
