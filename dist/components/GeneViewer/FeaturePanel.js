"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturePanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const constants_1 = require("./constants");
function Field(props) {
  return (0, jsx_runtime_1.jsxs)("div", {
    style: { marginBottom: 10 },
    children: [
      (0, jsx_runtime_1.jsx)("div", {
        style: {
          fontSize: 11,
          color: constants_1.COLORS.textMuted,
          marginBottom: 2,
        },
        children: props.label,
      }),
      (0, jsx_runtime_1.jsx)("div", {
        style: { fontSize: 13, wordBreak: "break-word" },
        children: props.children,
      }),
    ],
  });
}
function FeaturePanel(props) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const f = props.feature;
  if (!f) {
    return (0, jsx_runtime_1.jsx)("div", {
      style: { padding: 12, color: constants_1.COLORS.textMuted, fontSize: 13 },
      children: "Select a gene to see details.",
    });
  }
  const attrs = (_a = f.attributes) !== null && _a !== void 0 ? _a : {};
  const locusTag =
    (_c =
      (_b = attrs.locus_tag) !== null && _b !== void 0 ? _b : f.locus_tag) !==
      null && _c !== void 0
      ? _c
      : "—";
  const name =
    (_f =
      (_e = (_d = attrs.Name) !== null && _d !== void 0 ? _d : attrs.gene) !==
        null && _e !== void 0
        ? _e
        : attrs.ID) !== null && _f !== void 0
      ? _f
      : "—";
  const product =
    (_h =
      (_g = attrs.product) !== null && _g !== void 0 ? _g : attrs.Product) !==
      null && _h !== void 0
      ? _h
      : "—";
  return (0, jsx_runtime_1.jsxs)("div", {
    style: { padding: 12 },
    children: [
      (0, jsx_runtime_1.jsx)("div", {
        style: { fontWeight: 800, marginBottom: 10 },
        children: "Feature Details",
      }),
      (0, jsx_runtime_1.jsx)(Field, { label: "Locus Tag", children: locusTag }),
      (0, jsx_runtime_1.jsx)(Field, { label: "Name", children: name }),
      (0, jsx_runtime_1.jsx)(Field, { label: "Product", children: product }),
      (0, jsx_runtime_1.jsx)(Field, { label: "Type", children: f.type }),
      (0, jsx_runtime_1.jsxs)(Field, {
        label: "Location",
        children: [
          f.refName,
          ":",
          f.start + 1,
          "..",
          f.end,
          " (",
          f.strand === 1 ? "+" : f.strand === -1 ? "-" : ".",
          ")",
        ],
      }),
      props.essentiality
        ? (0, jsx_runtime_1.jsx)(Field, {
            label: "Essentiality Status",
            children: (0, jsx_runtime_1.jsxs)("span", {
              style: { display: "inline-flex", alignItems: "center", gap: 8 },
              children: [
                (0, jsx_runtime_1.jsx)("span", {
                  style: {
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: props.essentiality.color,
                    display: "inline-block",
                  },
                }),
                (0, jsx_runtime_1.jsx)("span", {
                  "aria-hidden": "true",
                  children: props.essentiality.icon,
                }),
                (0, jsx_runtime_1.jsx)("span", {
                  style: { fontWeight: 600 },
                  children: props.essentiality.status,
                }),
              ],
            }),
          })
        : null,
      (0, jsx_runtime_1.jsx)("div", {
        style: {
          marginTop: 14,
          fontWeight: 700,
          marginBottom: 6,
          fontSize: constants_1.TABLE_STYLES.fontSize,
        },
        children: "Attributes",
      }),
      (0, jsx_runtime_1.jsx)("div", {
        style: {
          border: `1px solid ${constants_1.COLORS.border}`,
          borderRadius: 6,
        },
        children: (0, jsx_runtime_1.jsx)("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: constants_1.TABLE_STYLES.fontSize,
          },
          children: (0, jsx_runtime_1.jsx)("tbody", {
            children: Object.entries(attrs).map(([k, v]) =>
              (0, jsx_runtime_1.jsxs)(
                "tr",
                {
                  children: [
                    (0, jsx_runtime_1.jsx)("td", {
                      style: {
                        padding: constants_1.TABLE_STYLES.cellPadding,
                        borderBottom: `1px solid ${constants_1.COLORS.borderLight}`,
                        width: 120,
                        color: constants_1.COLORS.textPrimary,
                      },
                      children: k,
                    }),
                    (0, jsx_runtime_1.jsx)("td", {
                      style: {
                        padding: constants_1.TABLE_STYLES.cellPadding,
                        borderBottom: `1px solid ${constants_1.COLORS.borderLight}`,
                        color: constants_1.COLORS.textDark,
                      },
                      children: v || "—",
                    }),
                  ],
                },
                k,
              ),
            ),
          }),
        }),
      }),
    ],
  });
}
exports.FeaturePanel = FeaturePanel;
