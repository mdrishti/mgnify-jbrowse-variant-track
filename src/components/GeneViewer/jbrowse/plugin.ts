import Plugin from "@jbrowse/core/Plugin";
import type PluginManager from "@jbrowse/core/PluginManager";
import { AdapterType } from "@jbrowse/core/pluggableElementTypes";

import Gff3TabixWithEssentialityAdapter, {
  configSchema as Gff3TabixWithEssentialityConfigSchema,
} from "./Gff3TabixWithEssentialityAdapter";
import { configSchema as Gff3WithEssentialityConfigSchema } from "./Gff3WithEssentialityAdapter";
import type { EssentialityColorMap, EssentialityStatus } from "../types";
import {
  DEFAULT_ESSENTIALITY_COLOR_MAP,
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import { COLORS } from "../constants";

type EssentialityIndex = Map<string, EssentialityStatus>;

interface GeneViewerJexlContext {
  selectedGeneId: string | null;
  essentialityEnabled: boolean;
  essentialityIndex: EssentialityIndex;
  essentialityColorMap?: EssentialityColorMap;
  featureJoinAttribute: string;
  highlightColor: string;
}

const ctx: GeneViewerJexlContext = {
  selectedGeneId: null,
  essentialityEnabled: false,
  essentialityIndex: new Map(),
  essentialityColorMap: DEFAULT_ESSENTIALITY_COLOR_MAP,
  featureJoinAttribute: "locus_tag",
  highlightColor: COLORS.highlight,
};

// Debug counter so we don't spam the console from JEXL
let debugGeneColorCount = 0;

/** Same as METT: JEXL reads window.selectedGeneId so highlight works regardless of React lifecycle. */
declare global {
  interface Window {
    selectedGeneId?: string | null;
  }
}

export function setGeneViewerJexlContext(
  partial: Partial<GeneViewerJexlContext>,
) {
  Object.assign(ctx, partial);
  if (typeof window !== "undefined" && partial.selectedGeneId !== undefined) {
    window.selectedGeneId = partial.selectedGeneId;
  }
}

/** Selected gene ID for JEXL (match METT: read from window.selectedGeneId first). */
function getSelectedGeneId(): string | null {
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

function getFeatureValue(feature: any, key: string): unknown {
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
    if (attrs && typeof attrs === "object" && key in attrs)
      return (attrs as Record<string, unknown>)[key];
    if (attrs && typeof attrs === "object" && lower in attrs)
      return (attrs as Record<string, unknown>)[lower];
  }
  const data = feature?.data ?? feature;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (key in d && d[key] != null && d[key] !== "") return d[key];
    if (
      key.toLowerCase() in d &&
      d[key.toLowerCase()] != null &&
      d[key.toLowerCase()] !== ""
    )
      return d[key.toLowerCase()];
    const attrs = d.attributes as Record<string, unknown> | undefined;
    if (attrs && typeof attrs === "object" && key in attrs) return attrs[key];
    if (attrs && typeof attrs === "object" && key.toLowerCase() in attrs)
      return attrs[key.toLowerCase()];
  }
  return undefined;
}

/** Get locus_tag from feature or any parent (for CDS/mRNA that inherit from gene). */
function getLocusTagFromFeature(feature: any): string {
  let f: any = feature;
  while (f) {
    const v = getFeatureValue(f, ctx.featureJoinAttribute || "locus_tag");
    if (v != null && v !== "") return String(v).trim();
    const id = getFeatureValue(f, "ID") ?? getFeatureValue(f, "id");
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
  name = "GeneViewerJBrowsePlugin";

  install(pluginManager: PluginManager) {
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

    const resolveEssentialityStatus = (feature: any): EssentialityStatus => {
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

    pluginManager.jexl.addFunction(
      "getColorForEssentiality",
      (essentiality: unknown) =>
        getColorForEssentiality(
          normalizeEssentialityStatus(essentiality),
          ctx.essentialityColorMap,
        ),
    );

    pluginManager.jexl.addFunction("selectedGeneId", () => getSelectedGeneId());

    pluginManager.jexl.addFunction("getEssentialityStatus", (feature: any) =>
      resolveEssentialityStatus(feature),
    );

    pluginManager.jexl.addFunction("getEssentialityIcon", (feature: any) =>
      ctx.essentialityEnabled
        ? getIconForEssentiality(resolveEssentialityStatus(feature))
        : "",
    );

    // Match METT: getGeneColor reads window.selectedGeneId and feature locus_tag; essentiality from feature or index
    pluginManager.jexl.addFunction("getGeneColor", (feature: any) => {
      try {
        const selectedId = getSelectedGeneId();
        if (selectedId) {
          // METT-style: feature?.locus_tag ?? feature?.get?.('locus_tag'); also check parents and ID formats
          const locusStr = getLocusTagFromFeature(feature);
          const idRaw =
            getFeatureValue(feature, "ID") ?? getFeatureValue(feature, "id");
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
        return DEFAULT_ESSENTIALITY_COLOR_MAP.unknown ?? "#DAA520";
      }
    });
  }
}
