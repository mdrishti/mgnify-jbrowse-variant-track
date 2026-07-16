"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_STYLES =
  exports.COLORS =
  exports.DEFAULT_VIEWER_HEIGHT_PX =
  exports.FEATURE_PANEL_WIDTH_PX =
  exports.CLICK_DEBOUNCE_MS =
  exports.VIEW_REPAINT_DELAY_MS =
  exports.ZOOM_RETRY_INTERVAL_MS =
  exports.ZOOM_RETRY_MAX =
  exports.GFF_QUERY_BUFFER_RATIO =
  exports.TABLE_NAV_WINDOW_MS =
  exports.SESSION_SELECTION_POLL_MS =
  exports.GFF_QUERY_DEBOUNCE_MS =
  exports.VISIBLE_REGION_POLL_MS =
  exports.MAX_VISIBLE_BP =
  exports.TABLE_SELECTION_COOLDOWN_MS =
  exports.DEFAULT_INITIAL_VISIBLE_BP =
    void 0;
/** Default bp to show in the initial viewport. User can scroll through the full contig. */
exports.DEFAULT_INITIAL_VISIBLE_BP = 20000;
/** After a table click, skip syncing from session.selection for this many ms. */
exports.TABLE_SELECTION_COOLDOWN_MS = 2000;
/**
 * Cap on visible bp range for the "genes in view" GFF query.
 * Only applied when the computed visible range exceeds this (e.g. very zoomed-out view).
 */
exports.MAX_VISIBLE_BP = 5000000;
/** Polling interval for visible region (genes in view). */
exports.VISIBLE_REGION_POLL_MS = 200;
/** Debounce for GFF query after visible region changes. */
exports.GFF_QUERY_DEBOUNCE_MS = 150;
/** Poll interval for session selection sync. */
exports.SESSION_SELECTION_POLL_MS = 300;
/** Window after table click during which we skip session sync and allow table nav. */
exports.TABLE_NAV_WINDOW_MS = 800;
/** Buffer ratio for GFF query (5% on each side). */
exports.GFF_QUERY_BUFFER_RATIO = 0.05;
/** Max retries for initial zoom. */
exports.ZOOM_RETRY_MAX = 30;
/** Interval between zoom retries. */
exports.ZOOM_RETRY_INTERVAL_MS = 100;
/** View repaint delay. */
exports.VIEW_REPAINT_DELAY_MS = 20;
/** Click debounce to avoid double-handling. */
exports.CLICK_DEBOUNCE_MS = 200;
/** Feature panel width (px). */
exports.FEATURE_PANEL_WIDTH_PX = 380;
/** Default viewer height (px). */
exports.DEFAULT_VIEWER_HEIGHT_PX = 720;
// --- Style constants ---
exports.COLORS = {
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
exports.TABLE_STYLES = {
  cellPadding: "6px 8px",
  fontSize: 12,
};
