"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenesInViewTable = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const constants_1 = require("../constants");
function GenesInViewTable(props) {
  const { features, selectedId, onSelect, joinAttribute } = props;
  const { cellPadding, fontSize } = constants_1.TABLE_STYLES;
  return (0, jsx_runtime_1.jsxs)("div", {
    style: { borderTop: `1px solid ${constants_1.COLORS.border}` },
    children: [
      (0, jsx_runtime_1.jsxs)("div", {
        style: { padding: "8px 12px", fontWeight: 800, fontSize },
        children: ["Features in view (", features.length, ")"],
      }),
      (0, jsx_runtime_1.jsx)("div", {
        style: { overflow: "visible" },
        children: (0, jsx_runtime_1.jsxs)("table", {
          style: { width: "100%", borderCollapse: "collapse", fontSize },
          children: [
            (0, jsx_runtime_1.jsx)("thead", {
              children: (0, jsx_runtime_1.jsxs)("tr", {
                style: {
                  position: "sticky",
                  top: 0,
                  background: constants_1.COLORS.background,
                },
                children: [
                  (0, jsx_runtime_1.jsx)("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${constants_1.COLORS.border}`,
                    },
                    children: "Locus tag",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${constants_1.COLORS.border}`,
                    },
                    children: "Product",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    style: {
                      textAlign: "left",
                      padding: cellPadding,
                      borderBottom: `1px solid ${constants_1.COLORS.border}`,
                    },
                    children: "Location",
                  }),
                ],
              }),
            }),
            (0, jsx_runtime_1.jsx)("tbody", {
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
                return (0, jsx_runtime_1.jsxs)(
                  "tr",
                  {
                    onClick: () => {
                      if (locus) onSelect(locus);
                    },
                    style: {
                      background: isSelected
                        ? constants_1.COLORS.selectedRow
                        : undefined,
                      cursor: locus ? "pointer" : "default",
                    },
                    tabIndex: locus ? 0 : -1,
                    onKeyDown: (e) => {
                      if ((e.key === "Enter" || e.key === " ") && locus)
                        onSelect(locus);
                    },
                    "aria-selected": locus ? isSelected : undefined,
                    children: [
                      (0, jsx_runtime_1.jsx)("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${constants_1.COLORS.borderLight}`,
                        },
                        children: locus || "—",
                      }),
                      (0, jsx_runtime_1.jsx)("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${constants_1.COLORS.borderLight}`,
                        },
                        children: product,
                      }),
                      (0, jsx_runtime_1.jsxs)("td", {
                        style: {
                          padding: cellPadding,
                          borderBottom: `1px solid ${constants_1.COLORS.borderLight}`,
                          color: constants_1.COLORS.textPrimary,
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
exports.GenesInViewTable = GenesInViewTable;
