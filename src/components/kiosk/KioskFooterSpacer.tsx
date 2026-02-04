import React from "react";
export function KioskFooterSpacer() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "calc(var(--footer-h) + env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    />
  );
}
