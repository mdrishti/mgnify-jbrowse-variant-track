import React, { useEffect } from "react";
import { extractLocusFromFeature } from "../utils/featureAttrUtils";
import { TABLE_SELECTION_COOLDOWN_MS, CLICK_DEBOUNCE_MS } from "../constants";
import type { GffFeature } from "../gff";

export function useGeneViewerClickHandler(opts: {
  viewState: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  genesInViewRef: React.MutableRefObject<GffFeature[]>;
  lastTableSelectionTimeRef: React.MutableRefObject<number>;
  setSelectedGeneId: (v: string) => void;
  resolveToLocusTag: (id: string, features: GffFeature[]) => string;
  joinAttribute: string;
}) {
  const {
    viewState,
    containerRef,
    genesInViewRef,
    lastTableSelectionTimeRef,
    setSelectedGeneId,
    resolveToLocusTag,
    joinAttribute,
  } = opts;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !viewState) return;

    const joinAttr = opts.joinAttribute;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!container.contains(target)) return;

      const boxEl = target.closest?.(
        '[data-testid^="box-"]',
      ) as HTMLElement | null;
      const overlayEl = !boxEl
        ? (target.closest?.("[data-testid]") as HTMLElement | null)
        : null;
      const el = boxEl ?? overlayEl;
      if (!el) return;

      let rawId = boxEl
        ? boxEl.getAttribute("data-testid")?.replace(/^box-/, "")?.trim()
        : overlayEl?.getAttribute("data-testid")?.trim();
      if (!rawId) return;

      if (
        /(container|tracks?|svg|placeholder|display)/i.test(rawId) ||
        rawId === "svgfeatures"
      )
        return;
      if (Date.now() - lastTableSelectionTimeRef.current < CLICK_DEBOUNCE_MS)
        return;

      const session: any = viewState.session;
      if (!session) return;

      let locus: string | null = null;
      let feature: any = null;

      const view = session.views?.[0];
      const tracks = view?.tracks ?? [];
      for (const track of tracks) {
        const conf = track.configuration;
        const trackId =
          typeof conf === "string" ? conf : (conf as any)?.trackId;
        if (trackId === "gene_features") {
          const display = track.displays?.[0];
          const featuresMap = display?.features;
          if (featuresMap && typeof featuresMap.get === "function") {
            feature = featuresMap.get(rawId);
            if (feature) {
              locus = extractLocusFromFeature(feature, joinAttr);
              break;
            }
          }
          break;
        }
      }

      if (!locus) {
        locus = resolveToLocusTag(rawId, genesInViewRef.current) || null;
        const hasMatchingFeature = genesInViewRef.current.some(
          (f) => extractLocusFromFeature(f, joinAttr) === rawId,
        );
        if (locus === rawId && !hasMatchingFeature) {
          locus = null;
        }
      }

      if (locus) {
        lastTableSelectionTimeRef.current = Date.now();
        setSelectedGeneId(locus);
        if (feature && typeof session.setSelection === "function") {
          session.setSelection(feature);
        }
        e.stopPropagation();
        e.preventDefault();
      }
    };

    container.addEventListener("click", handleClick, true);
    return () => container.removeEventListener("click", handleClick, true);
  }, [viewState, resolveToLocusTag, joinAttribute]);
}
