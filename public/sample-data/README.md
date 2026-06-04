# Sample data for quick start

Sample FASTA, GFF, and essentiality files for testing the GeneViewer locally. **Not included in the npm package.**

## Format requirements

The GeneViewer expects **BGZF-compressed** files with indexes:

| Asset | Required format | Index files |
|-------|-----------------|-------------|
| FASTA | `.fasta.gz` or `.fa.gz` (BGZF) | `.fai`, `.gzi` |
| GFF | `.gff.bgz` or `.gff.gz` (BGZF) | `.csi` |
| VCF | `.vcf.gz` (BGZF) | `.tbi` (tabix) |

If your files are uncompressed, see [Generating indexes](../../README.md#generating-indexes) in the main README.

## Directory structure

```
sample-data/
├── essentiality/
│   └── essentiality_sample.csv    # Ready to use
├── fasta_files/
│   └── BU_ATCC8492VPI0062_NT5002.1/
│       ├── *.fa.gz                # BGZF FASTA (create from .fa)
│       ├── *.fa.gz.fai            # samtools faidx output
│       └── *.fa.gz.gzi            # BGZF index
└── gff3_files/
    └── BU_ATCC8492/
        ├── *.gff.bgz              # BGZF GFF (create from .gff)
        ├── *.gff.bgz.csi          # CSI index
        └── trix/                  # Optional: JBrowse text search indexes
└── variants/
    └── BU_ATCC8492/
        ├── PMC12222025_variants.vcf.gz
        └── PMC12222025_variants.vcf.gz.tbi   # PMC12222025 lab-evolution SNPs
```

Regenerate VCF from curation template:

```bash
npm run build:sample-vcf
```

## Using with the demo app

1. Convert FASTA and GFF to BGZF if needed (see main README).
2. Copy `.env.example` to `.env.local`.
3. Set URLs to the sample data (when running `npm start`, use `http://localhost:5173/sample-data/...`):

```bash
VITE_ASSEMBLY_NAME=BU_ATCC8492VPI0062_NT5002.1
VITE_FASTA_GZ_URL=http://localhost:5173/sample-data/fasta_files/BU_ATCC8492VPI0062_NT5002.1/BU_ATCC8492VPI0062_NT5002.1.fa.gz
VITE_FASTA_FAI_URL=http://localhost:5173/sample-data/fasta_files/BU_ATCC8492VPI0062_NT5002.1/BU_ATCC8492VPI0062_NT5002.1.fa.gz.fai
VITE_FASTA_GZI_URL=http://localhost:5173/sample-data/fasta_files/BU_ATCC8492VPI0062_NT5002.1/BU_ATCC8492VPI0062_NT5002.1.fa.gz.gzi
VITE_GFF_BGZ_URL=http://localhost:5173/sample-data/gff3_files/BU_ATCC8492/BU_ATCC8492_annotations.gff.bgz
VITE_GFF_CSI_URL=http://localhost:5173/sample-data/gff3_files/BU_ATCC8492/BU_ATCC8492_annotations.gff.bgz.csi
VITE_ESSENTIALITY_CSV_URL=http://localhost:5173/sample-data/essentiality/essentiality_sample.csv
```

4. For the **variant track** demo, copy `bu.env.local` to `.env.local` at the repo root (includes `VITE_VCF_*` URLs).

5. Run `npm start` and open the URL (default `http://localhost:5173`). Initial view spans `contig_1:1198000..1216000` (~18 kb) around the **peg.962** SNP cluster (~9 variants visible). Scroll left for **peg.902**.
