import React, { useState } from "react";
import { KioskHeader } from "./KioskHeader";
import { KioskModal } from "./KioskModal";
import { KioskHelpContent } from "./KioskHelpContent";

export type KioskPageProps = {
  title: string;
  onHome?: () => void;
  children: React.ReactNode;
  variant?: "default" | "portrait";
  helpEnabled?: boolean; // por defecto true
};

export function KioskPage({
  title,
  onHome,
  children,
  variant = "default",
  helpEnabled = true,
}: KioskPageProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const cls =
    variant === "portrait"
      ? "kioskScreen kioskNoSelect kioskTouch kioskPortrait kioskContentWithHeaderFooter"
      : "kioskScreen kioskNoSelect kioskTouch kioskContentWithHeaderFooter";

  return (
    <div className={cls} style={{ paddingLeft: 16, paddingRight: 16 }}>
      <KioskHeader
        title={title}
        onHome={onHome}
        onHelp={helpEnabled ? () => setHelpOpen(true) : undefined}
      />

      {children}

      <KioskModal open={helpOpen} title="Ayuda" onClose={() => setHelpOpen(false)}>
        <KioskHelpContent />
      </KioskModal>
    </div>
  );
}
