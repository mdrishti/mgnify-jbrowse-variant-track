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
