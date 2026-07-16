import React from "react";
import type { EssentialityConfig } from "../types";
import {
  DEFAULT_ESSENTIALITY_COLOR_MAP,
  getColorForEssentiality,
  getIconForEssentiality,
  normalizeEssentialityStatus,
} from "../essentiality";
import { COLORS } from "../constants";

export function GeneViewerLegends(props: {
  essentiality?: EssentialityConfig;
  essentialityEnabled: boolean;
  onToggleEssentiality?: (next: boolean) => void;
}) {
  const showEssentiality = props.essentialityEnabled;
  const colorMap = {
    ...DEFAULT_ESSENTIALITY_COLOR_MAP,
    ...(props.essentiality?.colorMap ?? {}),
  };

  const essentialityItems = [
    { label: "Essential (Solid)", status: "essential_solid" },
    { label: "Essential (Liquid)", status: "essential_liquid" },
    { label: "Essential", status: "essential" },
    { label: "Non-Essential", status: "not_essential" },
    { label: "Unclear", status: "unclear" },
  ] as const;

  const codonItems = [
    { label: "Start Codon", color: "green" },
    { label: "Stop Codon", color: "red" },
  ] as const;

  const renderSwatch = (color: string) => (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 2,
        backgroundColor: color,
        marginRight: 6,
      }}
    />
  );

  return (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        alignItems: "flex-start",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginRight: 8,
        }}
      >
        <div style={{ fontWeight: 700 }}>Legend</div>
        {props.essentiality?.csvUrl ? (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={props.essentialityEnabled}
              onChange={(e) => props.onToggleEssentiality?.(e.target.checked)}
            />
            Include Essentiality in viewer
          </label>
        ) : null}
      </div>

      {showEssentiality ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Essentiality</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {essentialityItems.map((it) => {
              const status = normalizeEssentialityStatus(it.status);
              const color = getColorForEssentiality(status, colorMap);
              const icon = getIconForEssentiality(status);
              return (
                <div
                  key={it.label}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {renderSwatch(color)}
                  <span>
                    {it.label} <span aria-hidden="true">{icon}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Codons</div>
        {codonItems.map((it) => (
          <div
            key={it.label}
            style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
          >
            {renderSwatch(it.color)}
            <span>{it.label}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>User Actions</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {renderSwatch(COLORS.highlight)}
          <span>Selected Gene</span>
        </div>
      </div>
    </div>
  );
}
