# Variant track input — data specification

Use this when curating or re-exporting variant tables for the MGnify JBrowse **variant track** (VCF-based). Share this document with anyone supplying variant data.

## Why a separate format?

The manual curation export (`ManualCurationFromSupp_*.tsv`) mixes **two studies** and **33 strains** (mostly _Bacteroides_, plus _Parabacteroides_, _Phocaeicola_, _Mediterranea_, etc.). Variant types also differ:

| Source (PMC) | Strains            | Variant types                                 | Typical use in JBrowse                                                    |
| ------------ | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------- |
| PMC10939037  | 32                 | Mostly **inversions** (intervals, no Ref/Alt) | Structural / interval track (BED or symbolic VCF) — **not** the first POC |
| PMC12222025  | 1 (_B. uniformis_) | **SNPs**, indels, complex                     | **VariantTrack** + VCF (recommended first test)                           |

For development we standardise on **one genome assembly per file**, with coordinates that match that assembly’s sequence names (e.g. `contig_1` from the METT BU FASTA, not only NCBI accession IDs).

## One file = one assembly

Do **not** combine multiple strains or NCBI accessions in a single deliverable unless each row includes a valid `sequence_id` for that assembly and you accept multiple viewer configs.

Preferred approach:

1. **One TSV (or VCF) per genome** you want to display (e.g. `BU_ATCC8492_variants.tsv`).
2. Optional: a small **manifest** listing genome ID, assembly FASTA URL, annotation GFF URL, and variant file path.

## Required columns

| Column         | Required | Description                                                                  | Example          |
| -------------- | -------- | ---------------------------------------------------------------------------- | ---------------- |
| `genome_id`    | Yes      | Stable ID used in MGnify/METT (not free-text strain name alone)              | `BU_ATCC8492`    |
| `sequence_id`  | Yes      | Contig/chromosome name **exactly as in the assembly FASTA**                  | `contig_1`       |
| `start`        | Yes      | 1-based start (inclusive)                                                    | `369979`         |
| `end`          | Yes\*    | 1-based end (inclusive). For SNPs, `end` = `start` or `start + len(ref) - 1` | `369979`         |
| `ref`          | Yes\*\*  | Reference allele(s); use `.` for unknown                                     | `C`              |
| `alt`          | Yes\*\*  | Alternate allele(s); use `.` for unknown                                     | `T`              |
| `variant_type` | Yes      | Controlled vocabulary (see below)                                            | `snp`            |
| `variant_id`   | No       | Unique ID per row (defaults to gene + position in conversion)                | `peg.319:369979` |

\* Required for structural variants (inversion, CNV, etc.).  
\*\* Required for `snp`, `indel`, `complex`, `del`, `ins`, `delins`. For `inversion` / `translocation` without alleles, use `.` and rely on `start`/`end`.

## Recommended columns (strongly encouraged)

| Column                   | Description                                                             | Example                                |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------- |
| `gene_id`                | Gene identifier **in the same ID system as the GFF** used in the viewer | `BU_ATCC8492_00319`                    |
| `gene_id_source`         | Which namespace the gene ID belongs to                                  | `locus_tag`, `peg`, `protein_id`       |
| `effect`                 | Consequence                                                             | `missense`, `synonymous`, `frameshift` |
| `allele_frequency`       | 0–1 or 0–100% (state which in a README)                                 | `0.62` or `62%`                        |
| `strain`                 | Human-readable strain name                                              | `Bacteroides uniformis ATCC 8492`      |
| `ncbi_accession`         | NCBI sequence accession if coordinates were originally on that replicon | `NZ_DS362249.1`                        |
| `source_pmc`             | Publication source                                                      | `PMC12222025`                          |
| `project_id`             | BioProject / study                                                      | `PRJEB72794`                           |
| `experimental_condition` | Free text                                                               | `500 uM PFOA, 20 days`                 |

## `variant_type` values

Use lowercase:

- `snp`
- `indel`
- `del`, `ins`, `delins` (or `del,ins` if matching SO label)
- `complex`
- `inversion`
- `duplication`, `deletion`, `insertion` (structural, interval-based)

## Coordinate and assembly rules

1. **Same assembly as the browser**: coordinates must be lifted/annotated on the FASTA we serve (e.g. METT `BU_ATCC8492VPI0062_NT5002.1.fa`), not only on a different NCBI replicon version.
2. **`sequence_id` must match `.fai`**: e.g. `contig_1`, `contig_2` — not `NZ_DS362249.1` unless that string is literally the FASTA header name.
3. **1-based coordinates**, inclusive `start` and `end`, consistent with the supplementary table if that was 1-based.
4. If the only available IDs are `peg.*`, still provide coordinates; add `gene_id` + `gene_id_source=peg` and we can map later.

## Deliverables checklist

For each genome (e.g. BU_ATCC8492):

- [ ] Variant table: `docs/templates/variant_track_input.template.tsv` (filled)
- [ ] Assembly: BGZF FASTA + `.fai` + `.gzi` (or URL)
- [ ] Annotation: BGZF GFF + `.csi` (or URL)
- [ ] Note: coordinate system (1-based), AF scale (0–1 vs %), and assembly version/date

## Mapping from the current manual curation file

| Original column         | Maps to                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| Strain                  | `strain` (also derive `genome_id` where possible)                                 |
| Accession               | `ncbi_accession` — **not** a substitute for `sequence_id` unless it matches FASTA |
| Ref / Alt               | `ref` / `alt`                                                                     |
| Start / Stop            | `start` / `end`                                                                   |
| SequenceVariantTypeName | `variant_type`                                                                    |
| Gene                    | `gene_id` (+ set `gene_id_source`)                                                |
| Effect                  | `effect`                                                                          |
| Allele frequency        | `allele_frequency`                                                                |
| PMC ID                  | `source_pmc`                                                                      |
| Project ID              | `project_id`                                                                      |
| Experimental conditions | `experimental_condition`                                                          |

### Gaps in the current file (please fill for BU / uniformis SNPs)

The 26 _B. uniformis_ rows (PMC12222025) are the best fit for a first variant track but are missing:

- `genome_id` (suggest `BU_ATCC8492`)
- `sequence_id` (which contig: `contig_1` vs `contig_2`?)
- `gene_id` aligned to METT GFF (`BU_ATCC8492_*` vs `peg.*`)
- Confirmation that positions are on the **METT BU assembly**, not another uniformis assembly

## Template file

See [`templates/variant_track_input.template.tsv`](templates/variant_track_input.template.tsv) for a copy-paste header and example rows.

## Example scope for JBrowse POC

**Genome:** `BU_ATCC8492`  
**Assembly:** `BU_ATCC8492VPI0062_NT5002.1` (`contig_1`, `contig_2`)  
**Variants:** PMC12222025 supplementary SNPs/indels only (26 rows), after columns above are completed.

Structural inversion data (PMC10939037) can follow in a **separate** file per strain once interval + assembly mapping is confirmed.
