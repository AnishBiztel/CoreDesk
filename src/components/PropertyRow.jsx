import { useRef } from "react";
import DebouncedField from "./DebouncedField";
import { handleEnterSave } from "../lib/helpers";

function openPicker(ref) {
  const el = ref.current;
  if (!el) return;
  if (typeof el.showPicker === "function") {
    try {
      el.showPicker();
      return;
    } catch {
      /* fall through */
    }
  }
  el.focus();
}

// A single label/value row in the record's metadata column. Reads as plain
// text until you interact with it — no border, no card, just a hover
// background — and the value itself is the control (an inline input, a
// native select, or a hidden date input behind the formatted date).
export default function PropertyRow({ label, type = "text", value, placeholder, options, onCommit, onChange, disabled, mono, formatted }) {
  const dateRef = useRef(null);
  const empty = value === null || value === undefined || value === "";

  return (
    <div className="dp-prop-row">
      <span className="dp-prop-label">{label}</span>

      {type === "select" && (
        <select
          className="dp-prop-select"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}

      {type === "date" && (
        <button
          type="button"
          className={"dp-prop-value dp-prop-value-btn" + (empty ? " dp-prop-empty" : "")}
          onClick={() => openPicker(dateRef)}
          title={empty ? undefined : (formatted || value)}
        >
          {empty ? (placeholder || "Add date") : formatted || value}
          <input
            ref={dateRef}
            type="date"
            value={value || ""}
            onChange={(e) => onCommit(e.target.value)}
            className="dp-prop-date-input"
            tabIndex={-1}
          />
        </button>
      )}

      {type === "readonly" && (
        <span className={"dp-prop-value" + (empty ? " dp-prop-empty" : "")} title={empty ? undefined : (formatted || value)}>
          {empty ? "—" : (formatted || value)}
        </span>
      )}

      {type === "text" && (
        <DebouncedField
          className={"dp-prop-value dp-prop-input" + (mono ? " mono" : "")}
          placeholder={placeholder || "Add " + label.toLowerCase()}
          value={value || ""}
          onCommit={onCommit}
          onKeyDown={handleEnterSave}
          title={empty ? undefined : value}
        />
      )}
    </div>
  );
}
