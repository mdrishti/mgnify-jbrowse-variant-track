"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneViewerLegends = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const essentiality_1 = require("./essentiality");
const constants_1 = require("./constants");
function GeneViewerLegends(props) {
  var _a, _b, _c;
  const showEssentiality = props.essentialityEnabled;
  const colorMap = {
    ...essentiality_1.DEFAULT_ESSENTIALITY_COLOR_MAP,
    ...((_b =
      (_a = props.essentiality) === null || _a === void 0
        ? void 0
        : _a.colorMap) !== null && _b !== void 0
      ? _b
      : {}),
  };
  const essentialityItems = [
    { label: "Essential (Solid)", status: "essential_solid" },
    { label: "Essential (Liquid)", status: "essential_liquid" },
    { label: "Essential", status: "essential" },
    { label: "Non-Essential", status: "not_essential" },
    { label: "Unclear", status: "unclear" },
  ];
  const codonItems = [
    { label: "Start Codon", color: "green" },
    { label: "Stop Codon", color: "red" },
  ];
  const renderSwatch = (color) =>
    (0, jsx_runtime_1.jsx)("span", {
      style: {
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 2,
        backgroundColor: color,
        marginRight: 6,
      },
    });
  return (0, jsx_runtime_1.jsxs)("div", {
    style: {
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      gap: 24,
      flexWrap: "wrap",
      alignItems: "flex-start",
      fontSize: 12,
    },
    children: [
      (0, jsx_runtime_1.jsxs)("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginRight: 8,
        },
        children: [
          (0, jsx_runtime_1.jsx)("div", {
            style: { fontWeight: 700 },
            children: "Legend",
          }),
          (
            (_c = props.essentiality) === null || _c === void 0
              ? void 0
              : _c.csvUrl
          )
            ? (0, jsx_runtime_1.jsxs)("label", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                },
                children: [
                  (0, jsx_runtime_1.jsx)("input", {
                    type: "checkbox",
                    checked: props.essentialityEnabled,
                    onChange: (e) => {
                      var _a;
                      return (_a = props.onToggleEssentiality) === null ||
                        _a === void 0
                        ? void 0
                        : _a.call(props, e.target.checked);
                    },
                  }),
                  "Include Essentiality in viewer",
                ],
              })
            : null,
        ],
      }),
      showEssentiality
        ? (0, jsx_runtime_1.jsxs)("div", {
            children: [
              (0, jsx_runtime_1.jsx)("div", {
                style: { fontWeight: 700, marginBottom: 4 },
                children: "Essentiality",
              }),
              (0, jsx_runtime_1.jsx)("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                },
                children: essentialityItems.map((it) => {
                  const status = (0,
                  essentiality_1.normalizeEssentialityStatus)(it.status);
                  const color = (0, essentiality_1.getColorForEssentiality)(
                    status,
                    colorMap,
                  );
                  const icon = (0, essentiality_1.getIconForEssentiality)(
                    status,
                  );
                  return (0, jsx_runtime_1.jsxs)(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center" },
                      children: [
                        renderSwatch(color),
                        (0, jsx_runtime_1.jsxs)("span", {
                          children: [
                            it.label,
                            " ",
                            (0, jsx_runtime_1.jsx)("span", {
                              "aria-hidden": "true",
                              children: icon,
                            }),
                          ],
                        }),
                      ],
                    },
                    it.label,
                  );
                }),
              }),
            ],
          })
        : null,
      (0, jsx_runtime_1.jsxs)("div", {
        children: [
          (0, jsx_runtime_1.jsx)("div", {
            style: { fontWeight: 700, marginBottom: 4 },
            children: "Codons",
          }),
          codonItems.map((it) =>
            (0, jsx_runtime_1.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 4,
                },
                children: [
                  renderSwatch(it.color),
                  (0, jsx_runtime_1.jsx)("span", { children: it.label }),
                ],
              },
              it.label,
            ),
          ),
        ],
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        children: [
          (0, jsx_runtime_1.jsx)("div", {
            style: { fontWeight: 700, marginBottom: 4 },
            children: "User Actions",
          }),
          (0, jsx_runtime_1.jsxs)("div", {
            style: { display: "flex", alignItems: "center" },
            children: [
              renderSwatch(constants_1.COLORS.highlight),
              (0, jsx_runtime_1.jsx)("span", { children: "Selected Gene" }),
            ],
          }),
        ],
      }),
    ],
  });
}
exports.GeneViewerLegends = GeneViewerLegends;
