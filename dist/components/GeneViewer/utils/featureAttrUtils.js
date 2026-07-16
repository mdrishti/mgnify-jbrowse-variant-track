"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLocusFromFeature = exports.getAttrFromFeature = void 0;
/**
 * Get an attribute from a JBrowse feature (supports .get(), .data, attributes object).
 */
function getAttrFromFeature(feature, key) {
  var _a;
  if (!feature) return undefined;
  if (typeof feature.get === "function") {
    const direct = feature.get(key);
    if (direct != null && direct !== "") return direct;
    const lower = key.toLowerCase();
    if (lower !== key) {
      const v = feature.get(lower);
      if (v != null && v !== "") return v;
    }
    const attrs = feature.get("attributes");
    if (attrs && typeof attrs === "object" && key in attrs) return attrs[key];
    if (attrs && typeof attrs === "object" && lower in attrs)
      return attrs[lower];
  }
  const data = (_a = feature.data) !== null && _a !== void 0 ? _a : feature;
  if (data && typeof data === "object") {
    for (const k of [key, key.toLowerCase()]) {
      if (k in data && data[k] != null && data[k] !== "") {
        return data[k];
      }
    }
    const attrs = data.attributes;
    if (attrs && typeof attrs === "object") {
      for (const k of [key, key.toLowerCase()]) {
        if (k in attrs && attrs[k] != null && attrs[k] !== "") {
          return attrs[k];
        }
      }
    }
  }
  return undefined;
}
exports.getAttrFromFeature = getAttrFromFeature;
/**
 * Extract locus_tag from a JBrowse feature, walking parent chain.
 */
function extractLocusFromFeature(feature, joinAttr) {
  var _a, _b, _c, _d, _e, _f;
  if (!feature) return null;
  let f = feature;
  while (f) {
    const val =
      (_c =
        (_b =
          (_a = getAttrFromFeature(f, joinAttr)) !== null && _a !== void 0
            ? _a
            : getAttrFromFeature(f, "locus_tag")) !== null && _b !== void 0
          ? _b
          : getAttrFromFeature(f, "ID")) !== null && _c !== void 0
        ? _c
        : getAttrFromFeature(f, "id");
    if (val != null && val !== "") {
      const s = String(val).trim();
      if (s.includes(":"))
        return (_e =
          (_d = s.split(":").pop()) === null || _d === void 0
            ? void 0
            : _d.trim()) !== null && _e !== void 0
          ? _e
          : null;
      return s;
    }
    f = (_f = f.parent) === null || _f === void 0 ? void 0 : _f.call(f);
  }
  return null;
}
exports.extractLocusFromFeature = extractLocusFromFeature;
