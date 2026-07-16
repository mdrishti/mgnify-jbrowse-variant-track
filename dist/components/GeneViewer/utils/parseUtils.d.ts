/** Parse initial location string to refName/start/end. Formats: "contig_1:1..10000" or "contig_1:1-10000" */
export declare function parseInitialLocation(loc: string): {
  refName: string;
  start: number;
  end: number;
} | null;
