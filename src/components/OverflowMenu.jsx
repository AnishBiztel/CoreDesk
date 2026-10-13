import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// Ghost "⋯" trigger + a small flat dropdown for secondary actions that
// don't belong in the panel's one primary button.
export default function OverflowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="dp-overflow" ref={ref}>
      <button type="button" className="icon-btn" aria-label="More actions" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="dp-overflow-menu" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              className={"dp-overflow-item" + (it.danger ? " danger" : "")}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
