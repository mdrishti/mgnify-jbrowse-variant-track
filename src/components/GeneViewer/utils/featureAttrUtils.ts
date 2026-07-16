/**
 * Get an attribute from a JBrowse feature (supports .get(), .data, attributes object).
 */
export function getAttrFromFeature(feature: any, key: string): unknown {
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
    if (attrs && typeof attrs === "object" && key in attrs)
      return (attrs as any)[key];
    if (attrs && typeof attrs === "object" && lower in attrs)
      return (attrs as any)[lower];
  }
  const data = (feature as any).data ?? feature;
  if (data && typeof data === "object") {
    for (const k of [key, key.toLowerCase()]) {
      if (k in data && (data as any)[k] != null && (data as any)[k] !== "") {
        return (data as any)[k];
      }
    }
    const attrs = (data as any).attributes;
    if (attrs && typeof attrs === "object") {
      for (const k of [key, key.toLowerCase()]) {
        if (
          k in attrs &&
          (attrs as any)[k] != null &&
          (attrs as any)[k] !== ""
        ) {
          return (attrs as any)[k];
        }
      }
    }
  }
  return undefined;
}

/**
 * Extract locus_tag from a JBrowse feature, walking parent chain.
 */
export function extractLocusFromFeature(
  feature: any,
  joinAttr: string,
): string | null {
  if (!feature) return null;
  let f: any = feature;
  while (f) {
    const val =
      getAttrFromFeature(f, joinAttr) ??
      getAttrFromFeature(f, "locus_tag") ??
      getAttrFromFeature(f, "ID") ??
      getAttrFromFeature(f, "id");
    if (val != null && val !== "") {
      const s = String(val).trim();
      if (s.includes(":")) return s.split(":").pop()?.trim() ?? null;
      return s;
    }
    f = f.parent?.();
  }
  return null;
}
