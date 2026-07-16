import type { GeneViewerProps, GffAdapterMode } from "../types";

export function buildAssemblyConfig(props: GeneViewerProps) {
  const { assembly } = props;
  return {
    name: assembly.name,
    sequence: {
      type: "ReferenceSequenceTrack",
      trackId: "ReferenceSequenceTrack",
      adapter: {
        type: "BgzipFastaAdapter",
        fastaLocation: { uri: assembly.fasta.fastaUrl },
        faiLocation: { uri: assembly.fasta.faiUrl },
        gziLocation: { uri: assembly.fasta.gziUrl },
      },
    },
  };
}

export function buildTracksConfig(
  props: GeneViewerProps,
  opts?: { adapterMode?: GffAdapterMode },
) {
  const { assembly, annotation, essentiality } = props;
  const gff = annotation.gff;

  const adapterMode = opts?.adapterMode ?? gff.gffAdapterMode ?? "auto";
  const usePlainAdapter = adapterMode === "plain";

  const labelFields = ["Name", "gene", "locus_tag", "ID"];
  const labelJexl = labelFields.map((f) => `get(feature,'${f}')`).join(" || ");

  const showEssentiality = !!essentiality?.enabled;
  const labelWithEss = showEssentiality
    ? `${labelJexl} + ' ' + getEssentialityIcon(feature)`
    : labelJexl;

  const essentialityFields = {
    essentialityCsvUrl:
      showEssentiality && essentiality?.csvUrl ? essentiality.csvUrl : "",
    csvJoinColumn: essentiality?.csvJoinColumn ?? "locus_tag",
    csvStatusColumn: essentiality?.csvStatusColumn ?? "essentiality",
    featureJoinAttribute: essentiality?.featureJoinAttribute ?? "locus_tag",
  };

  const adapterConfig = usePlainAdapter
    ? {
        type: "Gff3WithEssentialityAdapter" as const,
        gffLocation: { uri: gff.gffUrl },
        ...essentialityFields,
      }
    : {
        type: "Gff3TabixWithEssentialityAdapter" as const,
        gffGzLocation: { uri: gff.gffUrl },
        index: {
          indexType: "CSI" as const,
          location: { uri: gff.csiUrl },
        },
        ...essentialityFields,
      };

  const tracks: any[] = [];

  if (props.variants?.vcfUrl && props.variants?.tbiUrl) {
    tracks.push({
      type: "VariantTrack",
      trackId: "variants",
      name: props.variants.name ?? "Variants",
      assemblyNames: [assembly.name],
      category: ["Variants"],
      adapter: {
        type: "VcfTabixAdapter",
        vcfGzLocation: { uri: props.variants.vcfUrl },
        index: {
          indexType: "TBI" as const,
          location: { uri: props.variants.tbiUrl },
        },
      },
      displays: [
        {
          displayId: "variants-LinearVariantDisplay",
          type: "LinearVariantDisplay",
          height: 140,
          maxFeatureScreenDensity: 0.01,
        },
      ],
      visible: true,
    });
  }

  tracks.push({
    type: "FeatureTrack",
    trackId: "gene_features",
    name: annotation.name ?? "Genes",
    assemblyNames: [assembly.name],
    category: ["Annotations"],
    adapter: adapterConfig,
    ...(gff.ixUrl && gff.ixxUrl
      ? {
          textSearching: {
            textSearchAdapter: {
              type: "TrixTextSearchAdapter",
              textSearchAdapterId: "gff-trix",
              trackId: "gene_features",
              ixFilePath: { uri: gff.ixUrl },
              ixxFilePath: { uri: gff.ixxUrl },
              ...(gff.metaUrl ? { metaFilePath: { uri: gff.metaUrl } } : {}),
              assemblyNames: [assembly.name],
            },
          },
        }
      : {}),
    displays: [
      {
        displayId: "gene_features-LinearBasicDisplay",
        id: "gene_features-LinearBasicDisplay",
        type: "LinearBasicDisplay",
        height: 280,
        // Let JBrowse handle clicks -> session.setSelection(feature); we sync via poll
        renderer: {
          type: "SvgFeatureRenderer",
          // METT-style: jexl:getGeneColor(feature) for highlight + essentiality
          color1: "jexl:getGeneColor(feature)",
          color2: "jexl:getGeneColor(feature)",
          labels: {
            name: "jexl:" + labelWithEss,
          },
        },
      },
    ],
    visible: true,
  });

  return tracks;
}

export function buildDefaultSessionConfig(opts: {
  assemblyName: string;
  initialRefName: string;
  initialEnd: number;
  initialStart?: number;
  /** Pass the gene track from buildTracksConfig so session uses same displays (with JEXL color1/labels). Like METT: displays: track.displays */
  geneTrackConfig?: { trackId: string; type: string; displays: any[] };
  variantTrackConfig?: { trackId: string; type: string; displays: any[] };
}) {
  const start = opts.initialStart ?? 0;
  const end = Math.max(start + 1, opts.initialEnd);
  const geneTrack = opts.geneTrackConfig;
  const variantTrack = opts.variantTrackConfig;

  const sessionTracks: any[] = [
    {
      type: "ReferenceSequenceTrack",
      configuration: "ReferenceSequenceTrack",
      minimized: false,
      displays: [
        {
          id: "ReferenceSequenceTrack",
          type: "LinearReferenceSequenceDisplay",
          height: 200,
          showForward: true,
          showReverse: true,
          showTranslation: true,
          showLabels: true,
        },
      ],
    },
  ];

  if (variantTrack) {
    sessionTracks.push({
      id: variantTrack.trackId,
      type: "VariantTrack",
      configuration: variantTrack.trackId,
      minimized: false,
      visible: true,
      displays: variantTrack.displays,
    });
  }

  sessionTracks.push({
    id: geneTrack?.trackId ?? "gene_features",
    type: "FeatureTrack",
    configuration: geneTrack?.trackId ?? "gene_features",
    minimized: false,
    visible: true,
    displays: geneTrack?.displays ?? [
      {
        displayId: "gene_features-LinearBasicDisplay",
        id: "gene_features-LinearBasicDisplay",
        type: "LinearBasicDisplay",
        height: 280,
        renderer: {
          type: "SvgFeatureRenderer",
          color1: "jexl:getGeneColor(feature)",
          color2: "jexl:getGeneColor(feature)",
        },
      },
    ],
  });

  return {
    name: "Gene Viewer session",
    widgets: {
      BaseFeatureWidget: { type: "BaseFeatureWidget", disabled: true },
    },
    views: [
      {
        type: "LinearGenomeView",
        configuration: {
          header: { disable: true, hidden: true },
          // Let JBrowse set session.selection on click; we sync to panel/table via poll
        },
        displayedRegions: [
          {
            refName: opts.initialRefName,
            start,
            end,
            assemblyName: opts.assemblyName,
          },
        ],
        tracks: sessionTracks,
      },
    ],
  };
}
