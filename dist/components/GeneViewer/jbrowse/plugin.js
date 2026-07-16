"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGeneViewerJexlContext = void 0;
const Plugin_1 = __importDefault(require("@jbrowse/core/Plugin"));
const pluggableElementTypes_1 = require("@jbrowse/core/pluggableElementTypes");
const Gff3TabixWithEssentialityAdapter_1 = require("./Gff3TabixWithEssentialityAdapter");
const Gff3WithEssentialityAdapter_1 = require("./Gff3WithEssentialityAdapter");
const essentiality_1 = require("../essentiality");
const constants_1 = require("../constants");
const ctx = {
  selectedGeneId: null,
  essentialityEnabled: false,
  essentialityIndex: new Map(),
  essentialityColorMap: essentiality_1.DEFAULT_ESSENTIALITY_COLOR_MAP,
  featureJoinAttribute: "locus_tag",
  highlightColor: constants_1.COLORS.highlight,
};
// Debug counter so we don't spam the console from JEXL
let debugGeneColorCount = 0;
function setGeneViewerJexlContext(partial) {
  Object.assign(ctx, partial);
  if (typeof window !== "undefined" && partial.selectedGeneId !== undefined) {
    window.selectedGeneId = partial.selectedGeneId;
  }
}
exports.setGeneViewerJexlContext = setGeneViewerJexlContext;
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
class GeneViewerJBrowsePlugin extends Plugin_1.default {
  constructor() {
    super(...arguments);
    this.name = "GeneViewerJBrowsePlugin";
  }
  install(pluginManager) {
    pluginManager.addAdapterType(
      () =>
        new pluggableElementTypes_1.AdapterType({
          name: "Gff3TabixWithEssentialityAdapter",
          displayName: "GFF3 tabix with essentiality",
          configSchema: Gff3TabixWithEssentialityAdapter_1.configSchema,
          getAdapterClass: () =>
            Promise.resolve()
              .then(() =>
                __importStar(require("./Gff3TabixWithEssentialityAdapter")),
              )
              .then((r) => r.default),
        }),
    );
    pluginManager.addAdapterType(
      () =>
        new pluggableElementTypes_1.AdapterType({
          name: "Gff3WithEssentialityAdapter",
          displayName: "GFF3 whole-file with essentiality (for small GFFs)",
          configSchema: Gff3WithEssentialityAdapter_1.configSchema,
          getAdapterClass: () =>
            Promise.resolve()
              .then(() =>
                __importStar(require("./Gff3WithEssentialityAdapter")),
              )
              .then((r) => r.default),
        }),
    );
    const resolveEssentialityStatus = (feature) => {
      const featureId = getLocusTagFromFeature(feature) || null;
      const statusFromFeature = getFeatureValue(feature, "Essentiality");
      if (statusFromFeature) {
        return (0, essentiality_1.normalizeEssentialityStatus)(
          statusFromFeature,
        );
      }
      if (featureId) {
        const status = ctx.essentialityIndex.get(featureId);
        if (status) return status;
      }
      return "unknown";
    };
    pluginManager.jexl.addFunction("getColorForEssentiality", (essentiality) =>
      (0, essentiality_1.getColorForEssentiality)(
        (0, essentiality_1.normalizeEssentialityStatus)(essentiality),
        ctx.essentialityColorMap,
      ),
    );
    pluginManager.jexl.addFunction("selectedGeneId", () => getSelectedGeneId());
    pluginManager.jexl.addFunction("getEssentialityStatus", (feature) =>
      resolveEssentialityStatus(feature),
    );
    pluginManager.jexl.addFunction("getEssentialityIcon", (feature) =>
      ctx.essentialityEnabled
        ? (0, essentiality_1.getIconForEssentiality)(
            resolveEssentialityStatus(feature),
          )
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
        return (0, essentiality_1.getColorForEssentiality)(
          status,
          ctx.essentialityColorMap,
        );
      } catch (e) {
        return (_b = essentiality_1.DEFAULT_ESSENTIALITY_COLOR_MAP.unknown) !==
          null && _b !== void 0
          ? _b
          : "#DAA520";
      }
    });
  }
}
exports.default = GeneViewerJBrowsePlugin;
