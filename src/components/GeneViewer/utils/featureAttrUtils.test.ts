import {
  getAttrFromFeature,
  extractLocusFromFeature,
} from "./featureAttrUtils";

describe("getAttrFromFeature", () => {
  it("returns undefined for null/undefined feature", () => {
    expect(getAttrFromFeature(null, "locus_tag")).toBeUndefined();
    expect(getAttrFromFeature(undefined, "locus_tag")).toBeUndefined();
  });

  it("gets attribute via feature.get()", () => {
    const feature = {
      get: (key: string) => (key === "locus_tag" ? "BU_00001" : undefined),
    };
    expect(getAttrFromFeature(feature, "locus_tag")).toBe("BU_00001");
  });

  it("gets attribute from data object", () => {
    const feature = { data: { locus_tag: "BU_00002" } };
    expect(getAttrFromFeature(feature, "locus_tag")).toBe("BU_00002");
  });

  it("gets attribute from attributes object", () => {
    const feature = {
      get: (key: string) =>
        key === "attributes" ? { locus_tag: "BU_00003" } : undefined,
    };
    expect(getAttrFromFeature(feature, "locus_tag")).toBe("BU_00003");
  });
});

describe("extractLocusFromFeature", () => {
  it("extracts locus_tag from feature.get()", () => {
    const feature = {
      get: (key: string) => (key === "locus_tag" ? "BU_00001" : undefined),
      parent: () => undefined,
    };
    expect(extractLocusFromFeature(feature, "locus_tag")).toBe("BU_00001");
  });

  it("walks parent chain when locus not on current feature", () => {
    const parent = {
      get: (key: string) => (key === "locus_tag" ? "BU_00002" : undefined),
      parent: () => undefined,
    };
    const feature = {
      get: () => undefined,
      parent: () => parent,
    };
    expect(extractLocusFromFeature(feature, "locus_tag")).toBe("BU_00002");
  });

  it("returns null when no locus found", () => {
    const feature = {
      get: () => undefined,
      parent: () => undefined,
    };
    expect(extractLocusFromFeature(feature, "locus_tag")).toBeNull();
  });

  it('strips ID prefix (e.g. "gene:BU_00001" -> "BU_00001")', () => {
    const feature = {
      get: (key: string) => (key === "ID" ? "gene:BU_00001" : undefined),
      parent: () => undefined,
    };
    expect(extractLocusFromFeature(feature, "ID")).toBe("BU_00001");
  });
});
