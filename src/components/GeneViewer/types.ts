export type EssentialityStatus =
  | 'essential'
  | 'essential_liquid'
  | 'essential_solid'
  | 'not_essential'
  | 'unclear'
  | 'unknown';

export type EssentialityColorMap = Partial<Record<EssentialityStatus, string>> & {
  unknown?: string;
};

export interface FastaBgzipSource {
  /** BGZF-compressed FASTA URL/path. */
  fastaUrl: string;
  /** `samtools faidx` output (e.g. `.fai`) */
  faiUrl: string;
  /** BGZF index (e.g. `.gzi`) */
  gziUrl: string;
}

export type GffAdapterMode = 'tabix' | 'plain' | 'auto';

export interface GffBgzipSource {
  /** BGZF-compressed GFF3 URL/path (e.g. `.gff.bgz`) */
  gffUrl: string;
  /** CSI index (e.g. `.csi`). Works for all genome sizes. */
  csiUrl: string;
  /** Optional trix search indexes */
  ixUrl?: string;
  ixxUrl?: string;
  metaUrl?: string;
  /**
   * Adapter mode: 'auto' (default) uses HEAD to check size and picks plain if small; 'tabix' uses
   * indexed range requests; 'plain' fetches whole file (for small GFFs to avoid 416).
   */
  gffAdapterMode?: GffAdapterMode;
  /** When gffAdapterMode is 'auto', use plain adapter if file size < this (bytes). Default 256000. */
  smallGffThresholdBytes?: number;
}

export interface GeneViewerAssemblyConfig {
  name: string;
  /** Optional alias shown to the user */
  displayName?: string;
  fasta: FastaBgzipSource;
}

export interface GeneViewerAnnotationConfig {
  name?: string;
  gff: GffBgzipSource;
}

/** Tabix-indexed VCF (bgzip + .tbi) for VariantTrack. */
export interface GeneViewerVariantsConfig {
  name?: string;
  /** BGZF-compressed VCF URL/path */
  vcfUrl: string;
  /** Tabix index (e.g. `.vcf.gz.tbi`) */
  tbiUrl: string;
}

export interface EssentialityConfig {
  /** If true, apply essentiality coloring to the gene track. */
  enabled?: boolean;
  /** Optional CSV URL/path. If omitted, essentiality is treated as unknown for all features. */
  csvUrl?: string;
  /** CSV column that should be joined to GFF features (defaults to `locus_tag`). */
  csvJoinColumn?: string;
  /**
   * Feature attribute key to match against (defaults to `locus_tag`).
   * This assumes the GFF has `locus_tag=...` attributes.
   */
  featureJoinAttribute?: string;
  /** CSV column providing the essentiality status (defaults to `essentiality`). */
  csvStatusColumn?: string;
  /** Custom color mapping for statuses. */
  colorMap?: EssentialityColorMap;
}

export interface GeneViewerUiConfig {
  showLegends?: boolean;
  showFeaturePanel?: boolean;
  showGenesInViewTable?: boolean;
  /**
   * Which GFF feature types should appear in the table.
   * Defaults to `['CDS']` for broader format support (prokaryotes often have CDS only).
   */
  genesInViewTypes?: string[];
}

export interface GeneViewerInitialSelection {
  locusTag?: string;
}

export interface GeneViewerProps {
  assembly: GeneViewerAssemblyConfig;
  annotation: GeneViewerAnnotationConfig;
  /** Optional VCF variant track (requires @jbrowse/plugin-variants at runtime). */
  variants?: GeneViewerVariantsConfig;
  essentiality?: EssentialityConfig;
  ui?: GeneViewerUiConfig;
  initialSelection?: GeneViewerInitialSelection;
  /**
   * Optional initial location string, e.g. `contig_1:1..10000`.
   * If omitted, JBrowse will pick a default region.
   */
  initialLocation?: string;
  /**
   * Optional initial zoom level (base pairs per pixel).
   * Lower = more zoomed in (fewer genes visible). Higher = more zoomed out (more genes visible).
   * If set, overrides initialVisibleBp.
   */
  initialBpPerPx?: number;
  /**
   * Bp to show in the initial viewport. User can scroll through the full contig.
   * Default 20000. Set to undefined and omit initialBpPerPx to use showAllRegions() instead.
   */
  initialVisibleBp?: number;
  /**
   * Optional cap on region size in bp when initialLocation is not provided.
   * If omitted, the full contig length is used so the user can scroll through the entire contig.
   * If set, limits the displayed region (e.g. for very long contigs).
   */
  initialRegionBp?: number;
  /** Fixed height for the overall viewer area. */
  heightPx?: number;
}

