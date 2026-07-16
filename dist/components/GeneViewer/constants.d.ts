/** Default bp to show in the initial viewport. User can scroll through the full contig. */
export declare const DEFAULT_INITIAL_VISIBLE_BP = 20000;
/** After a table click, skip syncing from session.selection for this many ms. */
export declare const TABLE_SELECTION_COOLDOWN_MS = 2000;
/**
 * Cap on visible bp range for the "genes in view" GFF query.
 * Only applied when the computed visible range exceeds this (e.g. very zoomed-out view).
 */
export declare const MAX_VISIBLE_BP = 5000000;
/** Polling interval for visible region (genes in view). */
export declare const VISIBLE_REGION_POLL_MS = 200;
/** Debounce for GFF query after visible region changes. */
export declare const GFF_QUERY_DEBOUNCE_MS = 150;
/** Poll interval for session selection sync. */
export declare const SESSION_SELECTION_POLL_MS = 300;
/** Window after table click during which we skip session sync and allow table nav. */
export declare const TABLE_NAV_WINDOW_MS = 800;
/** Buffer ratio for GFF query (5% on each side). */
export declare const GFF_QUERY_BUFFER_RATIO = 0.05;
/** Max retries for initial zoom. */
export declare const ZOOM_RETRY_MAX = 30;
/** Interval between zoom retries. */
export declare const ZOOM_RETRY_INTERVAL_MS = 100;
/** View repaint delay. */
export declare const VIEW_REPAINT_DELAY_MS = 20;
/** Click debounce to avoid double-handling. */
export declare const CLICK_DEBOUNCE_MS = 200;
/** Feature panel width (px). */
export declare const FEATURE_PANEL_WIDTH_PX = 380;
/** Default viewer height (px). */
export declare const DEFAULT_VIEWER_HEIGHT_PX = 720;
export declare const COLORS: {
  readonly border: "#e5e7eb";
  readonly borderLight: "#f3f4f6";
  readonly textMuted: "#6b7280";
  readonly textPrimary: "#374151";
  readonly textDark: "#111827";
  readonly background: "#ffffff";
  readonly backgroundLight: "#f9fafb";
  readonly errorBg: "#fff7ed";
  readonly errorBorder: "#fed7aa";
  readonly errorText: "#9a3412";
  readonly highlight: "#2563eb";
  readonly selectedRow: "#eef2ff";
};
/** Shared table/cell styles for GenesInViewTable and FeaturePanel */
export declare const TABLE_STYLES: {
  readonly cellPadding: "6px 8px";
  readonly fontSize: 12;
};
