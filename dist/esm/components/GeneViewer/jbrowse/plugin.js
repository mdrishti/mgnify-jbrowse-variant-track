import Plugin from "@jbrowse/core/Plugin";
import { AdapterType } from "@jbrowse/core/pluggableElementTypes";
import { configSchema as Gff3TabixWithEssentialityConfigSchema } from "./Gff3TabixWithEssentialityAdapter";
import { configSchema as Gff3WithEssentialityConfigSchema } from "./Gff3WithEssentialityAdapter";
import {
  DEFAULT_ESSENTIALITY_COLOR_MAP,
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import { COLORS } from "../constants";
const ctx = {
  selectedGeneId: null,
  essentialityEnabled: false,
  essentialityIndex: new Map(),
  essentialityColorMap: DEFAULT_ESSENTIALITY_COLOR_MAP,
  featureJoinAttribute: "locus_tag",
  highlightColor: COLORS.highlight,
};
// Debug counter so we don't spam the console from JEXL
let debugGeneColorCount = 0;
export function setGeneViewerJexlContext(partial) {
  Object.assign(ctx, partial);
  if (typeof window !== "undefined" && partial.selectedGeneId !== undefined) {
    window.selectedGeneId = partial.selectedGeneId;
  }
}
/** Selected gene ID for JEXL (match METT: read from window.selectedGeneId first). */
function getSelectedGeneId() {
  if (
    typeof window !== "undefined" &&
    window.selectedGeneId != null &&
    window.selectedGeneId !== ""
  ) {
    const s = String(window.selectedGeneId).trim();
    if (s) return s;
  }
  return ctx.selectedGeneId ? String(ctx.selectedGeneId).trim() : null;
}
function getFeatureValue(feature, key) {
  var _a;
  if (!feature) return undefined;
  // JBrowse SimpleFeature: get(name) returns this.data[name]. Gff3TabixAdapter puts GFF attributes at top level (lowercased).
  if (typeof feature.get === "function") {
    const v = feature.get(key);
    if (v != null && v !== "") return v;
    const lower = key.toLowerCase();
    if (lower !== key) {
      const vLower = feature.get(lower);
      if (vLower != null && vLower !== "") return vLower;
    }
    const attrs = feature.get("attributes");
    if (attrs && typeof attrs === "object" && key in attrs) return attrs[key];
    if (attrs && typeof attrs === "object" && lower in attrs)
      return attrs[lower];
  }
  const data =
    (_a = feature === null || feature === void 0 ? void 0 : feature.data) !==
      null && _a !== void 0
      ? _a
      : feature;
  if (data && typeof data === "object") {
    const d = data;
    if (key in d && d[key] != null && d[key] !== "") return d[key];
    if (
      key.toLowerCase() in d &&
      d[key.toLowerCase()] != null &&
      d[key.toLowerCase()] !== ""
    )
      return d[key.toLowerCase()];
    const attrs = d.attributes;
    if (attrs && typeof attrs === "object" && key in attrs) return attrs[key];
    if (attrs && typeof attrs === "object" && key.toLowerCase() in attrs)
      return attrs[key.toLowerCase()];
  }
  return undefined;
}
/** Get locus_tag from feature or any parent (for CDS/mRNA that inherit from gene). */
function getLocusTagFromFeature(feature) {
  var _a;
  let f = feature;
  while (f) {
    const v = getFeatureValue(f, ctx.featureJoinAttribute || "locus_tag");
    if (v != null && v !== "") return String(v).trim();
    const id =
      (_a = getFeatureValue(f, "ID")) !== null && _a !== void 0
        ? _a
        : getFeatureValue(f, "id");
    if (id != null && id !== "") {
      const idStr = String(id).trim();
      // GFF IDs like "CDS:BU_ATCC8492_00001" or "transcript:BU_ATCC8492_00001" - locus is after colon
      if (idStr.includes(":")) {
        const part = idStr.split(":").pop();
        if (part) return part;
      }
      return idStr;
    }
    f = typeof f.parent === "function" ? f.parent() : null;
  }
  return "";
}
export default class GeneViewerJBrowsePlugin extends Plugin {
  constructor() {
    super(...arguments);
    this.name = "GeneViewerJBrowsePlugin";
  }
  install(pluginManager) {
    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: "Gff3TabixWithEssentialityAdapter",
          displayName: "GFF3 tabix with essentiality",
          configSchema: Gff3TabixWithEssentialityConfigSchema,
          getAdapterClass: () =>
            import("./Gff3TabixWithEssentialityAdapter").then((r) => r.default),
        }),
    );
    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: "Gff3WithEssentialityAdapter",
          displayName: "GFF3 whole-file with essentiality (for small GFFs)",
          configSchema: Gff3WithEssentialityConfigSchema,
          getAdapterClass: () =>
            import("./Gff3WithEssentialityAdapter").then((r) => r.default),
        }),
    );
    const resolveEssentialityStatus = (feature) => {
      const featureId = getLocusTagFromFeature(feature) || null;
      const statusFromFeature = getFeatureValue(feature, "Essentiality");
      if (statusFromFeature) {
        return normalizeEssentialityStatus(statusFromFeature);
      }
      if (featureId) {
        const status = ctx.essentialityIndex.get(featureId);
        if (status) return status;
      }
      return "unknown";
    };
    pluginManager.jexl.addFunction("getColorForEssentiality", (essentiality) =>
      getColorForEssentiality(
        normalizeEssentialityStatus(essentiality),
        ctx.essentialityColorMap,
      ),
    );
    pluginManager.jexl.addFunction("selectedGeneId", () => getSelectedGeneId());
    pluginManager.jexl.addFunction("getEssentialityStatus", (feature) =>
      resolveEssentialityStatus(feature),
    );
    pluginManager.jexl.addFunction("getEssentialityIcon", (feature) =>
      ctx.essentialityEnabled
        ? getIconForEssentiality(resolveEssentialityStatus(feature))
        : "",
    );
    // Match METT: getGeneColor reads window.selectedGeneId and feature locus_tag; essentiality from feature or index
    pluginManager.jexl.addFunction("getGeneColor", (feature) => {
      var _a, _b;
      try {
        const selectedId = getSelectedGeneId();
        if (selectedId) {
          // METT-style: feature?.locus_tag ?? feature?.get?.('locus_tag'); also check parents and ID formats
          const locusStr = getLocusTagFromFeature(feature);
          const idRaw =
            (_a = getFeatureValue(feature, "ID")) !== null && _a !== void 0
              ? _a
              : getFeatureValue(feature, "id");
          const idStr = idRaw != null ? String(idRaw).trim() : "";
          const isMatch =
            locusStr === selectedId ||
            idStr === selectedId ||
            (idStr.includes(":") && idStr.split(":").pop() === selectedId);
          if (debugGeneColorCount < 20) {
            // eslint-disable-next-line no-console
            console.log("[GeneViewer JEXL:getGeneColor]", {
              selectedId,
              locusStr,
              idStr,
              isMatch,
            });
            debugGeneColorCount += 1;
          }
          if (isMatch) {
            return ctx.highlightColor;
          }
        }
        // Essentiality: METT has it on feature (Essentiality); we use essentialityIndex when not on feature
        const status = resolveEssentialityStatus(feature);
        return getColorForEssentiality(status, ctx.essentialityColorMap);
      } catch (e) {
        return (_b = DEFAULT_ESSENTIALITY_COLOR_MAP.unknown) !== null &&
          _b !== void 0
          ? _b
          : "#DAA520";
      }
    });
  }
}
