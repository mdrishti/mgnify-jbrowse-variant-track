/**
 * Gff3WithEssentialityAdapter - Whole-file GFF3 adapter with essentiality injection.
 * Use for small GFFs (<128KB) to avoid 416 Range Not Satisfiable from JBrowse's 128KB chunking.
 * Extends Gff3Adapter and adds Essentiality/EssentialityVisual from a CSV to each feature.
 */
import { ConfigurationSchema } from "@jbrowse/core/configuration";
import Gff3Adapter from "@jbrowse/plugin-gff3/esm/Gff3Adapter/Gff3Adapter";
import Gff3AdapterConfigSchema from "@jbrowse/plugin-gff3/esm/Gff3Adapter/configSchema";
import SimpleFeature, { type Feature } from "@jbrowse/core/util/simpleFeature";
import { ObservableCreate } from "@jbrowse/core/util/rxjs";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import {
  buildEssentialityIndexFromCsv,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import type { EssentialityStatus } from "../types";

export const configSchema = ConfigurationSchema(
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
    baseConfiguration: Gff3AdapterConfigSchema,
    explicitlyTyped: true,
  },
);

function getLocusTag(feature: any, joinAttr: string): string {
  const v = feature.get?.(joinAttr) ?? feature.get?.("locus_tag");
  if (v != null && v !== "") return String(v).trim();
  const id = feature.get?.("ID") ?? feature.get?.("id");
  if (id != null && id !== "") {
    const s = String(id).trim();
    if (s.includes(":")) return s.split(":").pop()?.trim() ?? "";
    return s;
  }
  let p = feature.parent?.();
  while (p) {
    const pv = p.get?.(joinAttr) ?? p.get?.("locus_tag");
    if (pv != null && pv !== "") return String(pv).trim();
    const pid = p.get?.("ID") ?? p.get?.("id");
    if (pid != null && pid !== "") {
      const ps = String(pid).trim();
      if (ps.includes(":")) return ps.split(":").pop()?.trim() ?? "";
      return ps;
    }
    p = p.parent?.();
  }
  return "";
}

export default class Gff3WithEssentialityAdapter extends Gff3Adapter {
  static type = "Gff3WithEssentialityAdapter";

  private essentialityIndex: Map<string, EssentialityStatus> = new Map();
  private essentialityLoaded = false;

  private async ensureEssentialityLoaded() {
    if (this.essentialityLoaded) return;
    const csvUrl = this.getConf("essentialityCsvUrl") as string;
    if (csvUrl?.trim()) {
      try {
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const idx = buildEssentialityIndexFromCsv(text, {
            joinColumn: this.getConf("csvJoinColumn") ?? "locus_tag",
            statusColumn: this.getConf("csvStatusColumn") ?? "essentiality",
          });
          this.essentialityIndex = new Map();
          idx.forEach((row, key) =>
            this.essentialityIndex.set(key, row.status),
          );
        }
      } catch {
        // ignore
      }
    }
    this.essentialityLoaded = true;
  }

  getFeatures(query: any, opts: any = {}): Observable<Feature> {
    return ObservableCreate(async (observer) => {
      await this.ensureEssentialityLoaded();
      const joinAttr =
        (this.getConf("featureJoinAttribute") as string) ?? "locus_tag";
      const excludeTypes = new Set(["region", "chromosome", "contig"]);
      super
        .getFeatures(query, opts)
        .pipe(
          filter((feature: Feature) => {
            const type = String(
              (feature as any).get?.("type") ?? "",
            ).toLowerCase();
            return !excludeTypes.has(type);
          }),
          map((feature: Feature) => {
            const locus = getLocusTag(feature, joinAttr);
            const status: EssentialityStatus = locus
              ? (this.essentialityIndex.get(locus) ?? "unknown")
              : "unknown";
            const normalized = normalizeEssentialityStatus(status);
            (feature as any).set("Essentiality", normalized);
            (feature as any).set(
              "EssentialityVisual",
              getIconForEssentiality(normalized),
            );

            // METT-style: use locus_tag-derived id for click handling
            if (locus) {
              const json = (feature as any).toJSON();
              const fType = (feature as any).get?.("type") ?? "";
              const origId = (feature as any).id?.() ?? json.uniqueId ?? "";
              const newId =
                fType === "gene" ? locus : `${locus}::${fType}::${origId}`;
              return new SimpleFeature({ ...json, uniqueId: newId });
            }
            return feature;
          }),
        )
        .subscribe(observer);
    }, opts?.stopToken);
  }
}
