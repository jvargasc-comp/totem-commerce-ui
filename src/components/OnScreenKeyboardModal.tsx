import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string;
  placeholder?: string;
  maxLength?: number;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

type KeyDef =
  | { type: "char"; label: string; value?: string; grow?: number }
  | { type: "action"; label: string; action: "backspace" | "space" | "clear" | "shift"; grow?: number };

const ROWS_BASE: KeyDef[][] = [
  [
    { type: "char", label: "q" }, { type: "char", label: "w" }, { type: "char", label: "e" }, { type: "char", label: "r" },
    { type: "char", label: "t" }, { type: "char", label: "y" }, { type: "char", label: "u" }, { type: "char", label: "i" },
    { type: "char", label: "o" }, { type: "char", label: "p" },
  ],
  [
    { type: "char", label: "a" }, { type: "char", label: "s" }, { type: "char", label: "d" }, { type: "char", label: "f" },
    { type: "char", label: "g" }, { type: "char", label: "h" }, { type: "char", label: "j" }, { type: "char", label: "k" },
    { type: "char", label: "l" },
  ],
  [
    { type: "action", label: "Shift", action: "shift", grow: 1.4 },
    { type: "char", label: "z" }, { type: "char", label: "x" }, { type: "char", label: "c" }, { type: "char", label: "v" },
    { type: "char", label: "b" }, { type: "char", label: "n" }, { type: "char", label: "m" },
    { type: "action", label: "⌫", action: "backspace", grow: 1.4 },
  ],
  [
    { type: "action", label: "Clear", action: "clear", grow: 1.4 },
    { type: "char", label: "0" }, { type: "char", label: "1" }, { type: "char", label: "2" }, { type: "char", label: "3" },
    { type: "char", label: "4" }, { type: "char", label: "5" }, { type: "char", label: "6" }, { type: "char", label: "7" },
    { type: "char", label: "8" }, { type: "char", label: "9" },
    { type: "char", label: "-" }, { type: "char", label: "#" }, { type: "char", label: "." }, { type: "char", label: "," },
  ],
  [{ type: "action", label: "Espacio", action: "space", grow: 5 }],
];

export default function OnScreenKeyboardModal({
  open,
  title = "Ingresar texto",
  initialValue = "",
  placeholder = "Escribe aquí…",
  maxLength = 120,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [shift, setShift] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
      setShift(false);
    }
  }, [open, initialValue]);

  const rows = useMemo(() => {
    return ROWS_BASE.map((row) =>
      row.map((k) => {
        if (k.type !== "char") return k;
        const isLetter = /^[a-z]$/i.test(k.label);
        const out = shift && isLetter ? k.label.toUpperCase() : k.label;
        return { ...k, value: out, label: out };
      })
    );
  }, [shift]);

  const append = (text: string) => {
    setValue((prev) => (prev + text).slice(0, maxLength));
  };

  const backspace = () => setValue((prev) => prev.slice(0, -1));
  const clear = () => setValue("");

  const handleKey = (k: KeyDef) => {
    if (k.type === "char") return append(k.value ?? k.label);
    switch (k.action) {
      case "backspace":
        return backspace();
      case "space":
        return append(" ");
      case "clear":
        return clear();
      case "shift":
        return setShift((s) => !s);
    }
  };

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
    <div style={styles.backdrop}>
      {/* Panel centrado: 100% ancho, 40% alto */}
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.title}>{title}</div>

          <div style={styles.actions}>
            <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onCancel}>
              Cancelar
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => onConfirm(value.trim())}
              disabled={value.trim().length === 0}
            >
              Listo
            </button>
          </div>
        </div>

        <div style={styles.inputRow}>
          <div style={styles.inputBox}>
            <div style={{ opacity: value.length ? 1 : 0.5 }}>
              {value.length ? value : placeholder}
            </div>
            <div style={styles.counter}>
              {value.length}/{maxLength}
            </div>
          </div>
        </div>

        <div style={styles.keyboard}>
          {rows.map((row, idx) => (
            <div key={idx} style={styles.row}>
              {row.map((k, i) => {
                const grow = (k as any).grow ?? 1;
                const isShift = k.type === "action" && k.action === "shift";
                const isDanger = k.type === "action" && k.action === "clear";
                const isBack = k.type === "action" && k.action === "backspace";
                const active = isShift && shift;

                return (
                  <button
                    key={i}
                    style={{
                      ...styles.key,
                      flex: grow,
                      ...(active ? styles.keyActive : null),
                      ...(isDanger ? styles.keyDanger : null),
                      ...(isBack ? styles.keyBack : null),
                    }}
                    onClick={() => handleKey(k)}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          ))}
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
    width: "80vw", // ✅ 80% ancho
    height: "40vh", // ✅ 40% alto
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
  actions: { display: "flex", gap: 10 },
  btn: {
    fontSize: 18,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent",
    color: "white",
  },
  btnGhost: { background: "rgba(255,255,255,0.06)" },
  btnPrimary: { background: "rgba(255,255,255,0.16)" },

  inputRow: { paddingTop: 10, paddingBottom: 8 },
  inputBox: {
    position: "relative",
    minHeight: 50,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    padding: "12px 14px",
    fontSize: 22,
    display: "flex",
    alignItems: "center",
  },
  counter: {
    position: "absolute",
    right: 12,
    bottom: 8,
    fontSize: 12,
    opacity: 0.65,
  },

  keyboard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 6,
  },
  row: { display: "flex", gap: 8 },
  key: {
    height: 48, // ✅ más compacto
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: 22,
    fontWeight: 800,
    touchAction: "manipulation",
  },
  keyActive: { background: "rgba(255,255,255,0.18)" },
  keyDanger: { background: "rgba(255, 80, 80, 0.18)" },
  keyBack: { background: "rgba(255,255,255,0.12)" },
};
