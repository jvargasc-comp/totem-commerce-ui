import { useEffect, useRef } from "react";

type Options = {
  timeoutMs: number;
  onIdle: () => void;
  enabled?: boolean;
};

export function useIdleTimer({ timeoutMs, onIdle, enabled = true }: Options) {
  const timerRef = useRef<number | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const reset = () => {
    if (!enabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onIdleRef.current(), timeoutMs);
  };

  useEffect(() => {
    if (!enabled) return;

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "pointermove",
      "touchstart",
      "keydown",
      "scroll",
    ];

    const handler = () => reset();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, timeoutMs]);

  return { resetIdle: reset };
}
