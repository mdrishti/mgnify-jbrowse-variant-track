import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { COLORS, TABLE_STYLES } from "../constants";
export function GenesInViewTable(props) {
  const { features, selectedId, onSelect, joinAttribute } = props;
  const { cellPadding, fontSize } = TABLE_STYLES;
  return _jsxs("div", {
    style: { borderTop: `1px solid ${COLORS.border}` },
    children: [
      _jsxs("div", {
        style: { padding: "8px 12px", fontWeight: 800, fontSize },
        children: ["Features in view (", features.length, ")"],
      }),
      _jsx("div", {
        style: { overflow: "visible" },
        children: _jsxs("table", {
          style: { width: "100%", borderCollapse: "collapse", fontSize },
          children: [
            _jsx("thead", {
              children: _jsxs("tr", {
                style: {
                  position: "sticky",
                  top: 0,
                  background: COLORS.background,
                },
                children: [
                  _jsx("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.border}`,
                    },
                    children: "Locus tag",
                  }),
                  _jsx("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.border}`,
                    },
                    children: "Product",
                  }),
                  _jsx("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.border}`,
                    },
                    children: "Location",
                  }),
                ],
              }),
            }),
            _jsx("tbody", {
              children: features.map((f) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const attrs =
                  (_a = f.attributes) !== null && _a !== void 0 ? _a : {};
                const locus = String(
                  (_f =
                    (_e =
                      (_d =
                        (_c =
                          (_b = attrs[joinAttribute]) !== null && _b !== void 0
                            ? _b
                            : attrs.locus_tag) !== null && _c !== void 0
                          ? _c
                          : f.locus_tag) !== null && _d !== void 0
                        ? _d
                        : attrs.ID) !== null && _e !== void 0
                      ? _e
                      : f.id) !== null && _f !== void 0
                    ? _f
                    : "",
                );
                const product =
                  (_h =
                    (_g = attrs.product) !== null && _g !== void 0
                      ? _g
                      : attrs.Product) !== null && _h !== void 0
                    ? _h
                    : "—";
                const isSelected =
                  Boolean(selectedId) && Boolean(locus) && locus === selectedId;
                return _jsxs(
                  "tr",
                  {
                    onClick: () => {
                      if (locus) onSelect(locus);
                    },
                    style: {
                      background: isSelected ? COLORS.selectedRow : undefined,
                      cursor: locus ? "pointer" : "default",
                    },
                    tabIndex: locus ? 0 : -1,
                    onKeyDown: (e) => {
                      if ((e.key === "Enter" || e.key === " ") && locus)
                        onSelect(locus);
                    },
                    "aria-selected": locus ? isSelected : undefined,
                    children: [
                      _jsx("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${COLORS.borderLight}`,
                        },
                        children: locus || "—",
                      }),
                      _jsx("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${COLORS.borderLight}`,
                        },
                        children: product,
                      }),
                      _jsxs("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${COLORS.borderLight}`,
                          color: COLORS.textPrimary,
                        },
                        children: [f.refName, ":", f.start + 1, "..", f.end],
                      }),
                    ],
                  },
                  `${f.refName}:${f.start}:${f.end}:${locus}`,
                );
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
