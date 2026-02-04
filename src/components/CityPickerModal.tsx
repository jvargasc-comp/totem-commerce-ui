import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  cities: string[];
  selected?: string;
  onClose: () => void;
  onSelect: (city: string) => void;
  onOtherCity: () => void; // abre teclado para ciudad
};

export default function CityPickerModal({
  open,
  title = "Selecciona ciudad",
  cities,
  selected,
  onClose,
  onSelect,
  onOtherCity,
}: Props) {
  // Evitar scroll del body mientras está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>{title}</div>
          <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div style={styles.list}>
          {cities.map((c) => {
            const active = (selected ?? "").trim().toLowerCase() === c.trim().toLowerCase();
            return (
              <button
                key={c}
                type="button"
                className="kioskTouch kioskNoSelect"
                onClick={() => onSelect(c)}
                style={{
                  ...styles.item,
                  ...(active ? styles.itemActive : null),
                }}
              >
                <span>{c}</span>
                {active && <span style={{ opacity: 0.9 }}>✓</span>}
              </button>
            );
          })}

          <div style={{ height: 10 }} />

          <button
            type="button"
            className="kioskTouch kioskNoSelect"
            onClick={onOtherCity}
            style={{ ...styles.item, ...styles.itemOther }}
          >
            <span>Otra ciudad…</span>
            <span style={{ opacity: 0.9 }}>⌨️</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
    boxSizing: "border-box",
  },
  panel: {
    width: "80vw", // consistente con tu teclado
    height: "40vh",
    maxWidth: 980,
    background: "#0b0f14",
    color: "white",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 22px 70px rgba(0,0,0,.55)",
    padding: 14,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },
  title: { fontSize: 20, fontWeight: 900 },
  btn: {
    fontSize: 18,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent",
    color: "white",
  },
  btnGhost: { background: "rgba(255,255,255,0.06)" },
  list: {
    marginTop: 12,
    overflowY: "auto",
    display: "grid",
    gap: 10,
    paddingRight: 4,
  },
  item: {
    minHeight: 64,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 20,
    fontWeight: 900,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textAlign: "left",
    touchAction: "manipulation",
  },
  itemActive: {
    border: "1px solid rgba(47,125,255,.65)",
    background: "rgba(47,125,255,.22)",
  },
  itemOther: {
    border: "1px dashed rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.04)",
  },
};
