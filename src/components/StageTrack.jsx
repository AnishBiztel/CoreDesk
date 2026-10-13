// Slim horizontal pipeline: filled dots for the current and completed
// stages, hollow dots for what's ahead, one bold label for the current
// stage and nothing else — no "Active"/"Pending" text, no "Stage x of y".
// Entirely muted and inert once the client is churned.
export default function StageTrack({ stages, currentIndex, churned, onSelect }) {
  return (
    <div className="dp-stage-track" aria-label="Pipeline stage">
      {stages.map((stage, i) => {
        const done = !churned && i < currentIndex;
        const current = !churned && i === currentIndex;
        return (
          <div className="dp-stage-item" key={stage}>
            <button
              type="button"
              className={"dp-stage-node" + (done || current ? " filled" : "") + (churned ? " muted" : "")}
              onClick={() => !churned && onSelect(stage)}
              disabled={churned}
              aria-current={current ? "step" : undefined}
            />
            <span className={"dp-stage-label" + (current ? " current" : "") + (churned ? " muted" : "")}>{stage}</span>
            {i < stages.length - 1 && <span className={"dp-stage-connector" + (churned ? " muted" : "")} />}
          </div>
        );
      })}
    </div>
  );
}
