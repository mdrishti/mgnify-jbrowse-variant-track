/**
 * Gff3TabixWithEssentialityAdapter - METT-style adapter that injects Essentiality into GFF features.
 * Extends Gff3TabixAdapter and adds Essentiality/EssentialityVisual from a CSV to each feature.
 */
import { ConfigurationSchema } from "@jbrowse/core/configuration";
import Gff3TabixAdapter from "@jbrowse/plugin-gff3/esm/Gff3TabixAdapter/Gff3TabixAdapter";
import Gff3TabixConfigSchema from "@jbrowse/plugin-gff3/esm/Gff3TabixAdapter/configSchema";
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
  "Gff3TabixWithEssentialityAdapter",
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
    baseConfiguration: Gff3TabixConfigSchema,
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

export default class Gff3TabixWithEssentialityAdapter extends Gff3TabixAdapter {
  static type = "Gff3TabixWithEssentialityAdapter";

  private essentialityIndex: Map<string, EssentialityStatus> = new Map();
  private essentialityLoaded = false;

  async configure(opts: any = {}) {
    const result = await super.configure(opts);
    if (this.essentialityLoaded) return result;
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
    return result;
  }

  getFeatures(query: any, opts: any = {}): Observable<Feature> {
    return ObservableCreate(async (observer) => {
      await this.configure(opts);
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

            // METT-style: use locus_tag-derived id so data-testid="box-{id}" and click handler extracts locus_tag
            // Gene: locus_tag. CDS/mRNA: locus_tag::type::origId for uniqueness
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
