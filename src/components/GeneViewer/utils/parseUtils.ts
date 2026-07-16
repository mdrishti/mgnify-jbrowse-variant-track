/** Parse initial location string to refName/start/end. Formats: "contig_1:1..10000" or "contig_1:1-10000" */
export function parseInitialLocation(
  loc: string,
): { refName: string; start: number; end: number } | null {
  const m = loc.match(/^([^:]+):(\d+)\s*(?:\.\.|-)\s*(\d+)$/);
  if (!m) return null;
  const refName = m[1];
  const start1 = Number(m[2]);
  const end1 = Number(m[3]);
  if (!refName || !Number.isFinite(start1) || !Number.isFinite(end1))
    return null;
  const start = Math.max(0, Math.min(start1, end1) - 1);
  const end = Math.max(start + 1, Math.max(start1, end1));
  return { refName, start, end };
}
