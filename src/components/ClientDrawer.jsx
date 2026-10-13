import { useEffect } from "react";

// Slide-over drawer (master-detail pattern): houses ClientDetail's content
// without navigating away from whatever table/list the user clicked a row in.
// The close affordance lives in the content's own sticky header (passed
// onClose), not here, so it can sit next to the breadcrumb and the overflow
// menu exactly like Linear/Attio's record panels.
export default function ClientDrawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
