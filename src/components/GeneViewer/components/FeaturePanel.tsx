import React, { useState } from "react";
import type { GffFeature } from "../gff";
import { COLORS, TABLE_STYLES } from "../constants";

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 13, wordBreak: "break-word" }}>
        {props.children}
      </div>
    </div>
  );
}

function FeatureDetails({
  f,
  essentiality,
}: {
  f: GffFeature;
  essentiality?: { status: string; color: string; icon: string } | null;
}) {
  const attrs = f.attributes ?? {};
  const locusTag = attrs.locus_tag ?? f.locus_tag ?? "—";
  const name = attrs.Name ?? attrs.gene ?? attrs.ID ?? "—";
  const product = attrs.product ?? attrs.Product ?? "—";

  return (
    <div
      style={{
        paddingLeft: 8,
        borderLeft: `2px solid ${COLORS.border}`,
        marginBottom: 12,
      }}
    >
      <Field label="Locus Tag">{locusTag}</Field>
      <Field label="Name">{name}</Field>
      <Field label="Product">{product}</Field>
      <Field label="Type">{f.type}</Field>
      <Field label="Location">
        {f.refName}:{f.start + 1}..{f.end} (
        {f.strand === 1 ? "+" : f.strand === -1 ? "-" : "."})
      </Field>

      {essentiality ? (
        <Field label="Essentiality Status">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: essentiality.color,
                display: "inline-block",
              }}
            />
            <span aria-hidden="true">{essentiality.icon}</span>
            <span style={{ fontWeight: 600 }}>{essentiality.status}</span>
          </span>
        </Field>
      ) : null}

      <div
        style={{
          marginTop: 10,
          fontWeight: 700,
          marginBottom: 4,
          fontSize: TABLE_STYLES.fontSize,
        }}
      >
        Attributes
      </div>
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 6 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: TABLE_STYLES.fontSize,
          }}
        >
          <tbody>
            {Object.entries(attrs).map(([k, v]) => (
              <tr key={k}>
                <td
                  style={{
                    padding: TABLE_STYLES.cellPadding,
                    borderBottom: `1px solid ${COLORS.borderLight}`,
                    width: 120,
                    color: COLORS.textPrimary,
                  }}
                >
                  {k}
                </td>
                <td
                  style={{
                    padding: TABLE_STYLES.cellPadding,
                    borderBottom: `1px solid ${COLORS.borderLight}`,
                    color: COLORS.textDark,
                  }}
                >
                  {v || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CdsCollapsible({
  index,
  feature,
  expanded,
  onToggle,
}: {
  index: number;
  feature: GffFeature;
  expanded: boolean;
  onToggle: () => void;
}) {
  const product =
    feature.attributes?.product ?? feature.attributes?.Product ?? "—";
  const location = `${feature.refName}:${feature.start + 1}..${feature.end}`;
  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
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
        }}
        aria-expanded={expanded}
      >
        <span style={{ fontSize: 10, flexShrink: 0 }}>
          {expanded ? "▼" : "▶"}
        </span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          CDS {index + 1}: {product} ({location})
        </span>
      </button>
      {expanded && (
        <div style={{ marginTop: 6 }}>
          <FeatureDetails f={feature} essentiality={null} />
        </div>
      )}
    </div>
  );
}

export function FeaturePanel(props: {
  features: GffFeature[];
  essentiality?: { status: string; color: string; icon: string } | null;
}) {
  const { features, essentiality } = props;
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    () => new Set(),
  );

  const toggleIndex = (i: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (!features.length) {
    return (
      <div style={{ padding: 12, color: COLORS.textMuted, fontSize: 13 }}>
        Select a feature to see details.
      </div>
    );
  }

  const locusTag =
    features[0].attributes?.locus_tag ?? features[0].locus_tag ?? "—";

  if (features.length === 1) {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Feature Details</div>
        <FeatureDetails f={features[0]} essentiality={essentiality} />
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Feature Details</div>
      <Field label="Gene">{locusTag}</Field>
      <Field label="CDS count">{features.length}</Field>

      {essentiality ? (
        <Field label="Essentiality Status">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: essentiality.color,
                display: "inline-block",
              }}
            />
            <span aria-hidden="true">{essentiality.icon}</span>
            <span style={{ fontWeight: 600 }}>{essentiality.status}</span>
          </span>
        </Field>
      ) : null}

      <div style={{ marginTop: 12 }}>
        {features.map((f, i) => (
          <CdsCollapsible
            key={`${f.refName}:${f.start}:${f.end}`}
            index={i}
            feature={f}
            expanded={expandedIndices.has(i)}
            onToggle={() => toggleIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
