"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = void 0;
/**
 * Gff3WithEssentialityAdapter - Whole-file GFF3 adapter with essentiality injection.
 * Use for small GFFs (<128KB) to avoid 416 Range Not Satisfiable from JBrowse's 128KB chunking.
 * Extends Gff3Adapter and adds Essentiality/EssentialityVisual from a CSV to each feature.
 */
const configuration_1 = require("@jbrowse/core/configuration");
const Gff3Adapter_1 = __importDefault(
  require("@jbrowse/plugin-gff3/esm/Gff3Adapter/Gff3Adapter"),
);
const configSchema_1 = __importDefault(
  require("@jbrowse/plugin-gff3/esm/Gff3Adapter/configSchema"),
);
const simpleFeature_1 = __importDefault(
  require("@jbrowse/core/util/simpleFeature"),
);
const rxjs_1 = require("@jbrowse/core/util/rxjs");
const operators_1 = require("rxjs/operators");
const essentiality_1 = require("../essentiality");
exports.configSchema = (0, configuration_1.ConfigurationSchema)(
  "Gff3WithEssentialityAdapter",
  {
    essentialityCsvUrl: {
      type: "string",
      defaultValue: "",
      description: "URL to essentiality CSV (locus_tag, essentiality columns)",
    },
    csvJoinColumn: {
      type: "string",
      defaultValue: "locus_tag",
    },
    csvStatusColumn: {
      type: "string",
      defaultValue: "essentiality",
    },
    featureJoinAttribute: {
      type: "string",
      defaultValue: "locus_tag",
    },
  },
  {
    baseConfiguration: configSchema_1.default,
    explicitlyTyped: true,
  },
);
function getLocusTag(feature, joinAttr) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
  const v =
    (_b =
      (_a = feature.get) === null || _a === void 0
        ? void 0
        : _a.call(feature, joinAttr)) !== null && _b !== void 0
      ? _b
      : (_c = feature.get) === null || _c === void 0
        ? void 0
        : _c.call(feature, "locus_tag");
  if (v != null && v !== "") return String(v).trim();
  const id =
    (_e =
      (_d = feature.get) === null || _d === void 0
        ? void 0
        : _d.call(feature, "ID")) !== null && _e !== void 0
      ? _e
      : (_f = feature.get) === null || _f === void 0
        ? void 0
        : _f.call(feature, "id");
  if (id != null && id !== "") {
    const s = String(id).trim();
    if (s.includes(":"))
      return (_h =
        (_g = s.split(":").pop()) === null || _g === void 0
          ? void 0
          : _g.trim()) !== null && _h !== void 0
        ? _h
        : "";
    return s;
  }
  let p =
    (_j = feature.parent) === null || _j === void 0 ? void 0 : _j.call(feature);
  while (p) {
    const pv =
      (_l =
        (_k = p.get) === null || _k === void 0
          ? void 0
          : _k.call(p, joinAttr)) !== null && _l !== void 0
        ? _l
        : (_m = p.get) === null || _m === void 0
          ? void 0
          : _m.call(p, "locus_tag");
    if (pv != null && pv !== "") return String(pv).trim();
    const pid =
      (_p =
        (_o = p.get) === null || _o === void 0 ? void 0 : _o.call(p, "ID")) !==
        null && _p !== void 0
        ? _p
        : (_q = p.get) === null || _q === void 0
          ? void 0
          : _q.call(p, "id");
    if (pid != null && pid !== "") {
      const ps = String(pid).trim();
      if (ps.includes(":"))
        return (_s =
          (_r = ps.split(":").pop()) === null || _r === void 0
            ? void 0
            : _r.trim()) !== null && _s !== void 0
          ? _s
          : "";
      return ps;
    }
    p = (_t = p.parent) === null || _t === void 0 ? void 0 : _t.call(p);
  }
  return "";
}
class Gff3WithEssentialityAdapter extends Gff3Adapter_1.default {
  constructor() {
    super(...arguments);
    this.essentialityIndex = new Map();
    this.essentialityLoaded = false;
  }
  async ensureEssentialityLoaded() {
    var _a, _b;
    if (this.essentialityLoaded) return;
    const csvUrl = this.getConf("essentialityCsvUrl");
    if (csvUrl === null || csvUrl === void 0 ? void 0 : csvUrl.trim()) {
      try {
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const idx = (0, essentiality_1.buildEssentialityIndexFromCsv)(text, {
            joinColumn:
              (_a = this.getConf("csvJoinColumn")) !== null && _a !== void 0
                ? _a
                : "locus_tag",
            statusColumn:
              (_b = this.getConf("csvStatusColumn")) !== null && _b !== void 0
                ? _b
                : "essentiality",
          });
          this.essentialityIndex = new Map();
          idx.forEach((row, key) =>
            this.essentialityIndex.set(key, row.status),
          );
        }
      } catch (_c) {
        // ignore
      }
    }
    this.essentialityLoaded = true;
  }
  getFeatures(query, opts = {}) {
    return (0, rxjs_1.ObservableCreate)(
      async (observer) => {
        var _a;
        await this.ensureEssentialityLoaded();
        const joinAttr =
          (_a = this.getConf("featureJoinAttribute")) !== null && _a !== void 0
            ? _a
            : "locus_tag";
        const excludeTypes = new Set(["region", "chromosome", "contig"]);
        super
          .getFeatures(query, opts)
          .pipe(
            (0, operators_1.filter)((feature) => {
              var _a, _b, _c;
              const type = String(
                (_c =
                  (_b = (_a = feature).get) === null || _b === void 0
                    ? void 0
                    : _b.call(_a, "type")) !== null && _c !== void 0
                  ? _c
                  : "",
              ).toLowerCase();
              return !excludeTypes.has(type);
            }),
            (0, operators_1.map)((feature) => {
              var _a, _b, _c, _d, _e, _f, _g, _h;
              const locus = getLocusTag(feature, joinAttr);
              const status = locus
                ? (_a = this.essentialityIndex.get(locus)) !== null &&
                  _a !== void 0
                  ? _a
                  : "unknown"
                : "unknown";
              const normalized = (0,
              essentiality_1.normalizeEssentialityStatus)(status);
              feature.set("Essentiality", normalized);
              feature.set(
                "EssentialityVisual",
                (0, essentiality_1.getIconForEssentiality)(normalized),
              );
              // METT-style: use locus_tag-derived id for click handling
              if (locus) {
                const json = feature.toJSON();
                const fType =
                  (_d =
                    (_c = (_b = feature).get) === null || _c === void 0
                      ? void 0
                      : _c.call(_b, "type")) !== null && _d !== void 0
                    ? _d
                    : "";
                const origId =
                  (_h =
                    (_g =
                      (_f = (_e = feature).id) === null || _f === void 0
                        ? void 0
                        : _f.call(_e)) !== null && _g !== void 0
                      ? _g
                      : json.uniqueId) !== null && _h !== void 0
                    ? _h
                    : "";
                const newId =
                  fType === "gene" ? locus : `${locus}::${fType}::${origId}`;
                return new simpleFeature_1.default({
                  ...json,
                  uniqueId: newId,
                });
              }
              return feature;
            }),
          )
          .subscribe(observer);
      },
      opts === null || opts === void 0 ? void 0 : opts.stopToken,
    );
  }
}
exports.default = Gff3WithEssentialityAdapter;
Gff3WithEssentialityAdapter.type = "Gff3WithEssentialityAdapter";
