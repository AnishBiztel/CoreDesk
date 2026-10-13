import { Check } from "lucide-react";

// Salesforce-style path: solid chevron segments, one per stage. Completed
// segments are filled green with a check, the current stage is filled
// accent-blue and bold, upcoming stages are flat neutral chips. Entirely
// muted and inert once the client is churned.
export default function StageTrack({ stages, currentIndex, churned, onSelect }) {
  return (
    <div className="sf-path" role="tablist" aria-label="Pipeline stage">
      {stages.map((stage, i) => {
        const done = !churned && i < currentIndex;
        const current = !churned && i === currentIndex;
        const state = churned ? "muted" : done ? "done" : current ? "current" : "upcoming";
        return (
          <button
            type="button"
            key={stage}
            className={"sf-path-item " + state}
            style={{ zIndex: stages.length - i }}
            onClick={() => !churned && onSelect(stage)}
            disabled={churned}
            aria-current={current ? "step" : undefined}
            aria-selected={current}
            role="tab"
          >
            {done && <Check size={12} className="sf-path-check" />}
            <span>{stage}</span>
          </button>
        );
      })}
    </div>
  );
}
