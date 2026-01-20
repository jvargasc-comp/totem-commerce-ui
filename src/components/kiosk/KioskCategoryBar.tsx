import React from "react";

export type KioskCategory = {
  id: string;
  name: string;
};

type Props = {
  categories: KioskCategory[];
  selectedId: string; // "" = todas
  onSelect: (id: string) => void;
};

export function KioskCategoryBar({ categories, selectedId, onSelect }: Props) {
  const allActive = selectedId === "";

  const pillStyle: React.CSSProperties = {
    minHeight: 72,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid rgba(233,238,246,.14)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: ".2px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    touchAction: "pan-x",
  };

  const pillActiveStyle: React.CSSProperties = {
    ...pillStyle,
    background: "var(--primary)",
    border: "1px solid rgba(47,125,255,.65)",
    boxShadow: "0 10px 26px rgba(47,125,255,.20)",
  };

  return (
    <div
      className="kioskTouch kioskNoSelect kioskHideScrollbar"
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 8,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <button
        type="button"
        onClick={() => onSelect("")}
        style={allActive ? pillActiveStyle : pillStyle}
      >
        Todas
      </button>

      {categories.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            style={active ? pillActiveStyle : pillStyle}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
