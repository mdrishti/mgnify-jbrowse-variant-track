import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { COLORS, TABLE_STYLES } from "../constants";
function Field(props) {
  return _jsxs("div", {
    style: { marginBottom: 10 },
    children: [
      _jsx("div", {
        style: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
        children: props.label,
      }),
      _jsx("div", {
        style: { fontSize: 13, wordBreak: "break-word" },
        children: props.children,
      }),
    ],
  });
}
function FeatureDetails({ f, essentiality }) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
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
  return _jsxs("div", {
    style: {
      paddingLeft: 8,
      borderLeft: `2px solid ${COLORS.border}`,
      marginBottom: 12,
    },
    children: [
      _jsx(Field, { label: "Locus Tag", children: locusTag }),
      _jsx(Field, { label: "Name", children: name }),
      _jsx(Field, { label: "Product", children: product }),
      _jsx(Field, { label: "Type", children: f.type }),
      _jsxs(Field, {
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
      essentiality
        ? _jsx(Field, {
            label: "Essentiality Status",
            children: _jsxs("span", {
              style: { display: "inline-flex", alignItems: "center", gap: 8 },
              children: [
                _jsx("span", {
                  style: {
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: essentiality.color,
                    display: "inline-block",
                  },
                }),
                _jsx("span", {
                  "aria-hidden": "true",
                  children: essentiality.icon,
                }),
                _jsx("span", {
                  style: { fontWeight: 600 },
                  children: essentiality.status,
                }),
              ],
            }),
          })
        : null,
      _jsx("div", {
        style: {
          marginTop: 10,
          fontWeight: 700,
          marginBottom: 4,
          fontSize: TABLE_STYLES.fontSize,
        },
        children: "Attributes",
      }),
      _jsx("div", {
        style: { border: `1px solid ${COLORS.border}`, borderRadius: 6 },
        children: _jsx("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: TABLE_STYLES.fontSize,
          },
          children: _jsx("tbody", {
            children: Object.entries(attrs).map(([k, v]) =>
              _jsxs(
                "tr",
                {
                  children: [
                    _jsx("td", {
                      style: {
                        padding: TABLE_STYLES.cellPadding,
                        borderBottom: `1px solid ${COLORS.borderLight}`,
                        width: 120,
                        color: COLORS.textPrimary,
                      },
                      children: k,
                    }),
                    _jsx("td", {
                      style: {
                        padding: TABLE_STYLES.cellPadding,
                        borderBottom: `1px solid ${COLORS.borderLight}`,
                        color: COLORS.textDark,
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
function CdsCollapsible({ index, feature, expanded, onToggle }) {
  var _a, _b, _c, _d;
  const product =
    (_d =
      (_b =
        (_a = feature.attributes) === null || _a === void 0
          ? void 0
          : _a.product) !== null && _b !== void 0
        ? _b
        : (_c = feature.attributes) === null || _c === void 0
          ? void 0
          : _c.Product) !== null && _d !== void 0
      ? _d
      : "—";
  const location = `${feature.refName}:${feature.start + 1}..${feature.end}`;
  return _jsxs("div", {
    style: { marginBottom: 6 },
    children: [
      _jsxs("button", {
        type: "button",
        onClick: onToggle,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 8px",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          background: COLORS.backgroundLight,
          cursor: "pointer",
          fontSize: TABLE_STYLES.fontSize,
          fontWeight: 600,
          textAlign: "left",
        },
        "aria-expanded": expanded,
        children: [
          _jsx("span", {
            style: { fontSize: 10, flexShrink: 0 },
            children: expanded ? "▼" : "▶",
          }),
          _jsxs("span", {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            children: ["CDS ", index + 1, ": ", product, " (", location, ")"],
          }),
        ],
      }),
      expanded &&
        _jsx("div", {
          style: { marginTop: 6 },
          children: _jsx(FeatureDetails, { f: feature, essentiality: null }),
        }),
    ],
  });
}
export function FeaturePanel(props) {
  var _a, _b, _c;
  const { features, essentiality } = props;
  const [expandedIndices, setExpandedIndices] = useState(() => new Set());
  const toggleIndex = (i) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  if (!features.length) {
    return _jsx("div", {
      style: { padding: 12, color: COLORS.textMuted, fontSize: 13 },
      children: "Select a feature to see details.",
    });
  }
  const locusTag =
    (_c =
      (_b =
        (_a = features[0].attributes) === null || _a === void 0
          ? void 0
          : _a.locus_tag) !== null && _b !== void 0
        ? _b
        : features[0].locus_tag) !== null && _c !== void 0
      ? _c
      : "—";
  if (features.length === 1) {
    return _jsxs("div", {
      style: { padding: 12 },
      children: [
        _jsx("div", {
          style: { fontWeight: 800, marginBottom: 10 },
          children: "Feature Details",
        }),
        _jsx(FeatureDetails, { f: features[0], essentiality: essentiality }),
      ],
    });
  }
  return _jsxs("div", {
    style: { padding: 12 },
    children: [
      _jsx("div", {
        style: { fontWeight: 800, marginBottom: 10 },
        children: "Feature Details",
      }),
      _jsx(Field, { label: "Gene", children: locusTag }),
      _jsx(Field, { label: "CDS count", children: features.length }),
      essentiality
        ? _jsx(Field, {
            label: "Essentiality Status",
            children: _jsxs("span", {
              style: { display: "inline-flex", alignItems: "center", gap: 8 },
              children: [
                _jsx("span", {
                  style: {
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: essentiality.color,
                    display: "inline-block",
                  },
                }),
                _jsx("span", {
                  "aria-hidden": "true",
                  children: essentiality.icon,
                }),
                _jsx("span", {
                  style: { fontWeight: 600 },
                  children: essentiality.status,
                }),
              ],
            }),
          })
        : null,
      _jsx("div", {
        style: { marginTop: 12 },
        children: features.map((f, i) =>
          _jsx(
            CdsCollapsible,
            {
              index: i,
              feature: f,
              expanded: expandedIndices.has(i),
              onToggle: () => toggleIndex(i),
            },
            `${f.refName}:${f.start}:${f.end}`,
          ),
        ),
      }),
    ],
  });
}
