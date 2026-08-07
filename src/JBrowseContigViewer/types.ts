export interface GenomeMeta {
  id: number;
  species: string;
  isolate_name: string;
  assembly_name: string;
  assembly_accession: string | null;
  fasta_file: string;
  gff_file: string;
  fasta_url: string;
  gff_url: string;
  type_strain: boolean;
}

/**
 * One labeled annotation source (e.g. AMR, BGCs, CRISPR/Cas) rendered as its
 * own FeatureTrack. `category` becomes the track selector's breadcrumb group.
 */
export interface AnnotationTrack {
  /** Stable id, used as JBrowse trackId — must be unique per assembly */
  id: string;
  /** Display name shown in the track list / panel header */
  label: string;
  /** Track-selector breadcrumb, e.g. ["Annotations", "AMR"] */
  category: string[];
  gffUrl: string;
  csiUrl: string;
  /** Optional trix text search indexes, gene-model track only in practice */
  ixUrl?: string;
  ixxUrl?: string;
  metaUrl?: string;
}
