"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeneViewerSelection = void 0;
const react_1 = require("react");
const essentiality_1 = require("../essentiality");
function useGeneViewerSelection(
  selectedGeneId,
  genesInView,
  joinAttribute,
  essentialityEnabled,
  essentialityIndex,
  essentialityColorMap,
) {
  /** All features (CDS) for the selected gene. When user selects a gene, we show all its CDS. */
  const selectedFeatures = (0, react_1.useMemo)(() => {
    if (!selectedGeneId) return [];
    const norm = String(selectedGeneId).trim();
    if (!norm) return [];
    return genesInView.filter((f) => {
      var _a, _b, _c, _d, _e, _f;
      const attrs = (_a = f.attributes) !== null && _a !== void 0 ? _a : {};
      const locus = String(
        (_f =
          (_e =
            (_d =
              (_c =
                (_b = attrs[joinAttribute]) !== null && _b !== void 0
                  ? _b
                  : attrs.locus_tag) !== null && _c !== void 0
                ? _c
                : f.locus_tag) !== null && _d !== void 0
              ? _d
              : attrs.ID) !== null && _e !== void 0
            ? _e
            : f.id) !== null && _f !== void 0
          ? _f
          : "",
      ).trim();
      if (locus === norm) return true;
      if (attrs.ID === norm || attrs.locus_tag === norm) return true;
      return Object.values(attrs).some((v) => String(v).trim() === norm);
    });
  }, [selectedGeneId, genesInView, joinAttribute]);
  const selectedLocusTag = (0, react_1.useMemo)(() => {
    var _a, _b, _c, _d, _e, _f;
    if (selectedFeatures.length > 0) {
      const f = selectedFeatures[0];
      const attrs = (_a = f.attributes) !== null && _a !== void 0 ? _a : {};
      return String(
        (_f =
          (_e =
            (_d =
              (_c =
                (_b = attrs[joinAttribute]) !== null && _b !== void 0
                  ? _b
                  : attrs.locus_tag) !== null && _c !== void 0
                ? _c
                : f.locus_tag) !== null && _d !== void 0
              ? _d
              : attrs.ID) !== null && _e !== void 0
            ? _e
            : f.id) !== null && _f !== void 0
          ? _f
          : "",
      ).trim();
    }
    return selectedGeneId ? String(selectedGeneId).trim() : null;
  }, [selectedFeatures, selectedGeneId, joinAttribute]);
  const selectedEssentiality = (0, react_1.useMemo)(() => {
    if (!essentialityEnabled || !selectedLocusTag) return null;
    const statusRaw = essentialityIndex.get(String(selectedLocusTag));
    if (!statusRaw) return null;
    const status = (0, essentiality_1.normalizeEssentialityStatus)(statusRaw);
    return {
      status,
      color: (0, essentiality_1.getColorForEssentiality)(
        status,
        essentialityColorMap,
      ),
      icon: (0, essentiality_1.getIconForEssentiality)(status),
    };
  }, [
    essentialityEnabled,
    selectedLocusTag,
    essentialityIndex,
    essentialityColorMap,
  ]);
  return { selectedFeatures, selectedLocusTag, selectedEssentiality };
}
exports.useGeneViewerSelection = useGeneViewerSelection;
