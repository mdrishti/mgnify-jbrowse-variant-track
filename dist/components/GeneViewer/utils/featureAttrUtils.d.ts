/**
 * Get an attribute from a JBrowse feature (supports .get(), .data, attributes object).
 */
export declare function getAttrFromFeature(feature: any, key: string): unknown;
/**
 * Extract locus_tag from a JBrowse feature, walking parent chain.
 */
export declare function extractLocusFromFeature(
  feature: any,
  joinAttr: string,
): string | null;
