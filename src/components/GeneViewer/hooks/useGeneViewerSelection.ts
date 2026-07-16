import { useMemo } from "react";
import {
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import type { GffFeature } from "../gff";
import type { EssentialityColorMap } from "../types";

export function useGeneViewerSelection(
  selectedGeneId: string | null,
  genesInView: GffFeature[],
  joinAttribute: string,
  essentialityEnabled: boolean,
  essentialityIndex: Map<string, string>,
  essentialityColorMap?: EssentialityColorMap,
) {
  /** All features (CDS) for the selected gene. When user selects a gene, we show all its CDS. */
  const selectedFeatures = useMemo(() => {
    if (!selectedGeneId) return [];
    const norm = String(selectedGeneId).trim();
    if (!norm) return [];
    return genesInView.filter((f) => {
      const attrs = f.attributes ?? {};
      const locus = String(
        attrs[joinAttribute] ??
          attrs.locus_tag ??
          f.locus_tag ??
          attrs.ID ??
          f.id ??
          "",
      ).trim();
      if (locus === norm) return true;
      if (attrs.ID === norm || attrs.locus_tag === norm) return true;
      return Object.values(attrs).some((v) => String(v).trim() === norm);
    });
  }, [selectedGeneId, genesInView, joinAttribute]);

  const selectedLocusTag = useMemo(() => {
    if (selectedFeatures.length > 0) {
      const f = selectedFeatures[0];
      const attrs = f.attributes ?? {};
      return String(
        attrs[joinAttribute] ??
          attrs.locus_tag ??
          f.locus_tag ??
          attrs.ID ??
          f.id ??
          "",
      ).trim();
    }
    return selectedGeneId ? String(selectedGeneId).trim() : null;
  }, [selectedFeatures, selectedGeneId, joinAttribute]);

  const selectedEssentiality = useMemo(() => {
    if (!essentialityEnabled || !selectedLocusTag) return null;
    const statusRaw = essentialityIndex.get(String(selectedLocusTag));
    if (!statusRaw) return null;
    const status = normalizeEssentialityStatus(statusRaw);
    return {
      status,
      color: getColorForEssentiality(status, essentialityColorMap),
      icon: getIconForEssentiality(status),
    };
  }, [
    essentialityEnabled,
    selectedLocusTag,
    essentialityIndex,
    essentialityColorMap,
  ]);

  return { selectedFeatures, selectedLocusTag, selectedEssentiality };
}
