/** Default bp to show in the initial viewport. User can scroll through the full contig. */
export const DEFAULT_INITIAL_VISIBLE_BP = 20000;
/** After a table click, skip syncing from session.selection for this many ms. */
export const TABLE_SELECTION_COOLDOWN_MS = 2000;
/**
 * Cap on visible bp range for the "genes in view" GFF query.
 * Only applied when the computed visible range exceeds this (e.g. very zoomed-out view).
 */
export const MAX_VISIBLE_BP = 5000000;
/** Polling interval for visible region (genes in view). */
export const VISIBLE_REGION_POLL_MS = 200;
/** Debounce for GFF query after visible region changes. */
export const GFF_QUERY_DEBOUNCE_MS = 150;
/** Poll interval for session selection sync. */
export const SESSION_SELECTION_POLL_MS = 300;
/** Window after table click during which we skip session sync and allow table nav. */
export const TABLE_NAV_WINDOW_MS = 800;
/** Buffer ratio for GFF query (5% on each side). */
export const GFF_QUERY_BUFFER_RATIO = 0.05;
/** Max retries for initial zoom. */
export const ZOOM_RETRY_MAX = 30;
/** Interval between zoom retries. */
export const ZOOM_RETRY_INTERVAL_MS = 100;
/** View repaint delay. */
export const VIEW_REPAINT_DELAY_MS = 20;
/** Click debounce to avoid double-handling. */
export const CLICK_DEBOUNCE_MS = 200;
/** Feature panel width (px). */
export const FEATURE_PANEL_WIDTH_PX = 380;
/** Default viewer height (px). */
export const DEFAULT_VIEWER_HEIGHT_PX = 720;
// --- Style constants ---
export const COLORS = {
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  textMuted: "#6b7280",
  textPrimary: "#374151",
  textDark: "#111827",
  background: "#ffffff",
  backgroundLight: "#f9fafb",
  errorBg: "#fff7ed",
  errorBorder: "#fed7aa",
  errorText: "#9a3412",
  highlight: "#2563eb",
  selectedRow: "#eef2ff",
};
/** Shared table/cell styles for GenesInViewTable and FeaturePanel */
export const TABLE_STYLES = {
  cellPadding: "6px 8px",
  fontSize: 12,
};
