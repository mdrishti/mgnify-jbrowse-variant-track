"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeneViewerHideDrawer = void 0;
const react_1 = require("react");
/** Hide JBrowse's native menu bar and feature drawer so only our custom panel is used. */
function useGeneViewerHideDrawer(viewState, containerRef) {
  (0, react_1.useEffect)(() => {
    if (!viewState) return;
    const container = containerRef.current;
    if (!container) return;
    const hideDrawerAndMenu = () => {
      var _a;
      const selectors = [
        ".MuiDrawer-root",
        ".MuiDrawer-modal",
        ".MuiDrawer-docked",
        '[class*="BaseFeatureDetail"]',
        '[class*="FeatureDetails"]',
        '[class*="DrawerWidget"]',
        '[class*="FeatureWidget"]',
        ".MuiBackdrop-root",
        '[aria-label*="drawer" i]',
      ];
      selectors.forEach((sel) => {
        try {
          container.querySelectorAll(sel).forEach((el) => {
            el.style.cssText =
              "display:none!important;visibility:hidden!important;pointer-events:none!important;";
          });
        } catch (_) {}
      });
      const fileBtn = container.querySelector(
        'button[data-testid="dropDownMenuButton"]',
      );
      if (
        (_a =
          fileBtn === null || fileBtn === void 0
            ? void 0
            : fileBtn.textContent) === null || _a === void 0
          ? void 0
          : _a.includes("File")
      ) {
        let p = fileBtn.parentElement;
        while (p) {
          if (p.classList.contains("MuiAppBar-root")) {
            p.style.display = "none";
            break;
          }
          p = p.parentElement;
        }
      }
    };
    hideDrawerAndMenu();
    const observer = new MutationObserver(hideDrawerAndMenu);
    observer.observe(container, { childList: true, subtree: true });
    const t1 = setTimeout(hideDrawerAndMenu, 100);
    const t2 = setTimeout(hideDrawerAndMenu, 500);
    const t3 = setTimeout(hideDrawerAndMenu, 1000);
    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [viewState]);
}
exports.useGeneViewerHideDrawer = useGeneViewerHideDrawer;
