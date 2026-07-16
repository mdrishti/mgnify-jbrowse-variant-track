import { useEffect } from "react";

/** Hide JBrowse's native menu bar and feature drawer so only our custom panel is used. */
export function useGeneViewerHideDrawer(
  viewState: any,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!viewState) return;
    const container = containerRef.current;
    if (!container) return;

    const hideDrawerAndMenu = () => {
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
            (el as HTMLElement).style.cssText =
              "display:none!important;visibility:hidden!important;pointer-events:none!important;";
          });
        } catch (_) {}
      });
      const fileBtn = container.querySelector(
        'button[data-testid="dropDownMenuButton"]',
      );
      if (fileBtn?.textContent?.includes("File")) {
        let p: HTMLElement | null = fileBtn.parentElement;
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
