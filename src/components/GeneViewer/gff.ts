import { RemoteFile } from "generic-filehandle";
import { TabixIndexedFile } from "@gmod/tabix";
import { unzip } from "@gmod/bgzf-filehandle";

export interface FaiRefInfo {
  refName: string;
  length: number;
}

export async function fetchFirstFaiRef(faiUrl: string): Promise<FaiRefInfo> {
  const res = await fetch(faiUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch FAI: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const line = text.split(/\r?\n/).find((l) => l.trim());
  if (!line) {
    throw new Error("FAI is empty");
  }
  const [refName, lengthStr] = line.split("\t");
  const length = Number(lengthStr);
  if (!refName || !Number.isFinite(length)) {
    throw new Error("Invalid FAI format");
  }
  return { refName, length };
}

export interface GffFeature {
  refName: string;
  start: number; // 0-based
  end: number; // interbase
  strand: 1 | -1 | 0;
  type: string;
  source: string;
  score?: string;
  phase?: string;
  attributes: Record<string, string>;
  /** Convenience IDs (may be missing depending on GFF) */
  id?: string;
  locus_tag?: string;
}

function parseGffAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pairs = attrString
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim();
    if (!key) continue;
    attrs[key] = val;
  }
  return attrs;
}

export async function queryGffRegion(opts: {
  gffUrl: string;
  /** CSI index URL (.csi) */
  csiUrl: string;
  refName: string;
  start: number;
  end: number;
  featureTypes?: string[];
}): Promise<GffFeature[]> {
  const file = new TabixIndexedFile({
    filehandle: new RemoteFile(opts.gffUrl),
    csiFilehandle: new RemoteFile(opts.csiUrl),
  });

  const wantedTypes = opts.featureTypes?.length
    ? new Set(opts.featureTypes)
    : null;
  const features: GffFeature[] = [];

  await file.getLines(opts.refName, opts.start, opts.end, (line: string) => {
    if (!line || line.startsWith("#")) return;
    const parts = line.split("\t");
    if (parts.length < 9) return;

    const [
      refName,
      source,
      type,
      start1,
      end1,
      score,
      strandChar,
      phase,
      attrString,
    ] = parts;
    if (wantedTypes && !wantedTypes.has(type)) return;

    // GFF is 1-based inclusive. Convert to 0-based interbase: [start-1, end]
    const start = Math.max(0, Number(start1) - 1);
    const end = Math.max(start, Number(end1));

    const strand: 1 | -1 | 0 =
      strandChar === "+" ? 1 : strandChar === "-" ? -1 : 0;

    const attributes = parseGffAttributes(attrString);

    const id = attributes.ID;
    const locus_tag = attributes.locus_tag;

    features.push({
      refName,
      source,
      type,
      start,
      end,
      score,
      strand,
      phase,
      attributes,
      id,
      locus_tag,
    });
  });

  return features;
}

/** Fetch Content-Length via HEAD. Returns null if unavailable. */
export async function fetchGffContentLength(
  gffUrl: string,
): Promise<number | null> {
  try {
    const res = await fetch(gffUrl, { method: "HEAD" });
    const len = res.headers.get("content-length");
    if (len) {
      const n = parseInt(len, 10);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Fetch whole GFF, parse, and filter by region. Use for small GFFs when tabix would hit 416. */
export async function queryGffRegionFromPlainGff(opts: {
  gffUrl: string;
  refName: string;
  start: number;
  end: number;
  featureTypes?: string[];
}): Promise<GffFeature[]> {
  const res = await fetch(opts.gffUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch GFF: ${res.status} ${res.statusText}`);
  }
  let buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length >= 3 && buf[0] === 31 && buf[1] === 139 && buf[2] === 8) {
    buf = await unzip(buf);
  }
  const text = new TextDecoder().decode(buf);
  const wantedTypes = opts.featureTypes?.length
    ? new Set(opts.featureTypes)
    : null;
  const features: GffFeature[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 9) continue;

    const [
      refName,
      source,
      type,
      start1,
      end1,
      score,
      strandChar,
      phase,
      attrString,
    ] = parts;
    if (refName !== opts.refName) continue;
    if (wantedTypes && !wantedTypes.has(type)) continue;

    const start = Math.max(0, Number(start1) - 1);
    const end = Math.max(start, Number(end1));

    if (end <= opts.start || start >= opts.end) continue;

    const strand: 1 | -1 | 0 =
      strandChar === "+" ? 1 : strandChar === "-" ? -1 : 0;

    const attributes = parseGffAttributes(attrString);

    features.push({
      refName,
      source,
      type,
      start,
      end,
      score,
      strand,
      phase,
      attributes,
      id: attributes.ID,
      locus_tag: attributes.locus_tag,
    });
  }

  return features;
}
