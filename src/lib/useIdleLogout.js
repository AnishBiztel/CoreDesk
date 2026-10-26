import { useEffect, useRef } from "react";

const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel"];

// Signs the user out after IDLE_LIMIT_MS of no interaction, so a session left
// open and untouched all day doesn't stay signed in forever. Only watches
// activity while `active` is true (i.e. while actually signed in), and
// resets the clock on real user input only — not on background network or
// timer activity, which shouldn't count as "being used".
export function useIdleLogout(active, onIdle) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    function reset() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, IDLE_LIMIT_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [active, onIdle]);
}
