#!/usr/bin/env node
/**
 * Build BU_ATCC8492 sample VCF from variant_track_input TSV (PMC12222025 curation rows).
 * Output: public/sample-data/variants/BU_ATCC8492/PMC12222025_variants.vcf
 * Run: node scripts/build-bu-sample-vcf.mjs && bgzip -f ... && tabix -p vcf ...
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const tsvPath =
  process.argv[2] ||
  path.join(root, 'docs/templates/BU_ATCC8492_variants_from_curation_draft.tsv');
const outDir = path.join(root, 'public/sample-data/variants/BU_ATCC8492');
const outVcf = path.join(outDir, 'PMC12222025_variants.vcf');

const CONTIG_LENGTHS = { contig_1: 4688977, contig_2: 22713 };

function parseAf(raw) {
  if (!raw || raw === '.') return null;
  const s = String(raw).trim().replace('%', '');
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n > 1 ? (n / 100).toFixed(4) : String(n);
}

function vcfEscape(s) {
  return String(s).replace(/[;,\s]/g, (c) => (c === ' ' ? '_' : c));
}

function parseTsv(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split('\t');
  const idx = (name) => header.indexOf(name);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (!cols[0] || cols[0].startsWith('#')) continue;
    rows.push({
      sequence_id: cols[idx('sequence_id')] || 'contig_1',
      start: Number(cols[idx('start')]),
      end: Number(cols[idx('end')]),
      ref: cols[idx('ref')],
      alt: cols[idx('alt')],
      variant_id: cols[idx('variant_id')],
      gene_id: cols[idx('gene_id')],
      effect: cols[idx('effect')],
      allele_frequency: cols[idx('allele_frequency')],
      source_pmc: cols[idx('source_pmc')],
      project_id: cols[idx('project_id')],
      experimental_condition: cols[idx('experimental_condition')],
      variant_type: cols[idx('variant_type')],
    });
  }
  return rows;
}

function main() {
  const tsv = fs.readFileSync(tsvPath, 'utf8');
  const rows = parseTsv(tsv).map((r) => ({
    ...r,
    sequence_id: r.sequence_id === 'NEEDS_CONTIG' ? 'contig_1' : r.sequence_id,
  }));

  const meta = [
    '##fileformat=VCFv4.2',
    '##source=MGnify-JBrowse sample (PMC12222025 B. uniformis lab evolution)',
    ...Object.entries(CONTIG_LENGTHS).map(
      ([id, len]) => `##contig=<ID=${id},length=${len}>`,
    ),
  ];

  const header =
    '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT';
  const body = [];

  for (const r of rows) {
    if (!r.ref || !r.alt || r.ref === '.' || r.alt === '.') continue;
    const pos = r.start;
    const id = r.variant_id || `${r.gene_id}:${pos}`;
    const af = parseAf(r.allele_frequency);
    const info = [
      `VT=${vcfEscape(r.variant_type || 'snp')}`,
      `GENE=${vcfEscape(r.gene_id)}`,
      `EFF=${vcfEscape(r.effect)}`,
      r.end !== r.start ? `END=${r.end}` : null,
      af != null ? `AF=${af}` : null,
      r.source_pmc ? `PMC=${r.source_pmc}` : null,
      r.project_id ? `PRJ=${r.project_id}` : null,
      r.experimental_condition
        ? `COND=${vcfEscape(r.experimental_condition).slice(0, 120)}`
        : null,
    ]
      .filter(Boolean)
      .join(';');
    body.push(
      [r.sequence_id, pos, id, r.ref, r.alt, '.', '.', info].join('\t'),
    );
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outVcf, [...meta, header, ...body].join('\n') + '\n');
  console.log(`Wrote ${body.length} variants to ${outVcf}`);
}

main();
