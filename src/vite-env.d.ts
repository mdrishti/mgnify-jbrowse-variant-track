/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSEMBLY_NAME: string;
  readonly VITE_FASTA_GZ_URL: string;
  readonly VITE_FASTA_FAI_URL: string;
  readonly VITE_FASTA_GZI_URL: string;
  readonly VITE_GFF_BGZ_URL: string;
  readonly VITE_GFF_CSI_URL: string;
  readonly VITE_ESSENTIALITY_CSV_URL?: string;
  readonly VITE_GFF_IX_URL?: string;
  readonly VITE_GFF_IXX_URL?: string;
  readonly VITE_GFF_META_URL?: string;
  readonly VITE_VCF_GZ_URL?: string;
  readonly VITE_VCF_TBI_URL?: string;
  readonly VITE_INITIAL_LOCATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
