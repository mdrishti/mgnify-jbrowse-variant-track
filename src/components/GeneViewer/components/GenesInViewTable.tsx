import React from "react";
import type { GffFeature } from "../gff";
import { COLORS, TABLE_STYLES } from "../constants";

export function GenesInViewTable(props: {
  features: GffFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  joinAttribute: string;
}) {
  const { features, selectedId, onSelect, joinAttribute } = props;

  const { cellPadding, fontSize } = TABLE_STYLES;
  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: "8px 12px", fontWeight: 800, fontSize }}>
        Features in view ({features.length})
      </div>
      <div style={{ overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
          <thead>
            <tr
              style={{
                position: "sticky",
                top: 0,
                background: COLORS.background,
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: cellPadding,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                Locus tag
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: cellPadding,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                Product
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: cellPadding,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => {
              const attrs = f.attributes ?? {};
              const locus = String(
                attrs[joinAttribute] ??
                  attrs.locus_tag ??
                  f.locus_tag ??
                  attrs.ID ??
                  f.id ??
                  "",
              );
              const product = attrs.product ?? attrs.Product ?? "—";
              const isSelected =
                Boolean(selectedId) && Boolean(locus) && locus === selectedId;
              return (
                <tr
                  key={`${f.refName}:${f.start}:${f.end}:${locus}`}
                  onClick={() => {
                    if (locus) onSelect(locus);
                  }}
                  style={{
                    background: isSelected ? COLORS.selectedRow : undefined,
                    cursor: locus ? "pointer" : "default",
                  }}
                  tabIndex={locus ? 0 : -1}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && locus)
                      onSelect(locus);
                  }}
                  aria-selected={locus ? isSelected : undefined}
                >
                  <td
                    style={{
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                    }}
                  >
                    {locus || "—"}
                  </td>
                  <td
                    style={{
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                    }}
                  >
                    {product}
                  </td>
                  <td
                    style={{
                      padding: cellPadding,
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                      color: COLORS.textPrimary,
                    }}
                  >
                    {f.refName}:{f.start + 1}..{f.end}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
