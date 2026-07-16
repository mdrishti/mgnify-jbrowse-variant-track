import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  DEFAULT_ESSENTIALITY_COLOR_MAP,
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import { COLORS } from "../constants";
export function GeneViewerLegends(props) {
  var _a, _b, _c;
  const showEssentiality = props.essentialityEnabled;
  const colorMap = {
    ...DEFAULT_ESSENTIALITY_COLOR_MAP,
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
    _jsx("span", {
      style: {
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 2,
        backgroundColor: color,
        marginRight: 6,
      },
    });
  return _jsxs("div", {
    style: {
      padding: "8px 12px",
      borderBottom: `1px solid ${COLORS.border}`,
      display: "flex",
      gap: 24,
      flexWrap: "wrap",
      alignItems: "flex-start",
      fontSize: 12,
    },
    children: [
      _jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginRight: 8,
        },
        children: [
          _jsx("div", { style: { fontWeight: 700 }, children: "Legend" }),
          (
            (_c = props.essentiality) === null || _c === void 0
              ? void 0
              : _c.csvUrl
          )
            ? _jsxs("label", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                },
                children: [
                  _jsx("input", {
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
        ? _jsxs("div", {
            children: [
              _jsx("div", {
                style: { fontWeight: 700, marginBottom: 4 },
                children: "Essentiality",
              }),
              _jsx("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                },
                children: essentialityItems.map((it) => {
                  const status = normalizeEssentialityStatus(it.status);
                  const color = getColorForEssentiality(status, colorMap);
                  const icon = getIconForEssentiality(status);
                  return _jsxs(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center" },
                      children: [
                        renderSwatch(color),
                        _jsxs("span", {
                          children: [
                            it.label,
                            " ",
                            _jsx("span", {
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
      _jsxs("div", {
        children: [
          _jsx("div", {
            style: { fontWeight: 700, marginBottom: 4 },
            children: "Codons",
          }),
          codonItems.map((it) =>
            _jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 4,
                },
                children: [
                  renderSwatch(it.color),
                  _jsx("span", { children: it.label }),
                ],
              },
              it.label,
            ),
          ),
        ],
      }),
      _jsxs("div", {
        children: [
          _jsx("div", {
            style: { fontWeight: 700, marginBottom: 4 },
            children: "User Actions",
          }),
          _jsxs("div", {
            style: { display: "flex", alignItems: "center" },
            children: [
              renderSwatch(COLORS.highlight),
              _jsx("span", { children: "Selected Gene" }),
            ],
          }),
        ],
      }),
    ],
  });
}
