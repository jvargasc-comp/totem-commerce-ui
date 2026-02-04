import React, { useEffect, useMemo, useRef, useState } from "react";
import { KioskHeader } from "./KioskHeader";
import { KioskModal } from "./KioskModal";
import { KioskHelpContent } from "./KioskHelpContent";
import { KioskStepBar } from "./KioskStepBar";

export type KioskStepId = "catalog" | "cart" | "checkout" | "pay" | "receipt";

export type KioskPageProps = {
  title: string;
  onHome?: () => void;
  children: React.ReactNode;
  variant?: "default" | "portrait";
  helpEnabled?: boolean;
  step?: KioskStepId;
};

export function KioskPage({
  title,
  onHome,
  children,
  variant = "default",
  helpEnabled = true,
  step,
}: KioskPageProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const showStep = typeof step === "string" && step.length > 0;

  const cls =
    variant === "portrait"
      ? "kioskScreen kioskNoSelect kioskTouch kioskPortrait kioskContentWithHeaderFooter"
      : "kioskScreen kioskNoSelect kioskTouch kioskContentWithHeaderFooter";

  // ✅ Medimos la altura real del header fijo para meter un spacer exacto
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const [topbarH, setTopbarH] = useState<number>(showStep ? 132 : 92);

  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;

    const measure = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) setTopbarH(h);
    };

    measure();

    // re-medir en resize
    window.addEventListener("resize", measure);

    // re-medir si cambia el layout (fonts, etc.)
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [showStep]);

  // opcional: minHeight, para evitar “saltos” visuales
  const minMainH = useMemo(() => `calc(100vh - ${topbarH}px)`, [topbarH]);

  return (
    <div
      className={cls}
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 0, // ✅ intenta neutralizar cualquier padding-top del class
      }}
    >
      {/* ✅ TOPBAR FIJO (NO sticky) */}
      <div
        ref={topbarRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          padding: "10px 16px",
          background:
            "linear-gradient(to bottom, rgba(10,14,22,.98), rgba(10,14,22,.90))",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(233,238,246,.10)",
          boxShadow: "0 14px 30px rgba(0,0,0,.22)",
        }}
      >
        <div style={{ maxWidth: "var(--content-max, 1100px)", margin: "0 auto" }}>
          <KioskHeader
            title={title}
            onHome={onHome}
            helpEnabled={helpEnabled}
            onHelp={() => setHelpOpen(true)}
          />

          {showStep ? (
            <div style={{ marginTop: 10 }}>
              <KioskStepBar current={step} />
            </div>
          ) : null}
        </div>
      </div>

      {/* ✅ Spacer exacto para que el contenido no quede detrás del header fijo */}
      <div style={{ height: topbarH }} />

      {/* CONTENIDO */}
      <div style={{ paddingTop: 14, minHeight: minMainH }}>{children}</div>
     
      <KioskModal open={helpOpen} title="Ayuda" onClose={() => setHelpOpen(false)}>
        <KioskHelpContent />
      </KioskModal>
    </div>
  );
}
