import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { STAGES } from "../lib/constants";

export default function AddDepartmentModal({ companyName, onSave, onClose }) {
  const [form, setForm] = useState({ companyName: companyName || "", departmentName: "", stage: "Lead" });
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    const co = form.companyName.trim();
    const dept = form.departmentName.trim();
    if (!co) return setError("Give the company a name.");
    if (!dept) return setError("Give this department or project a name, e.g. \"New Plant\" or \"Powertrain\".");
    onSave({ companyName: co, departmentName: dept, stage: form.stage });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" style={{ width: 440 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="cal-modal-head">
          <div className="modal-title" style={{ marginBottom: 0 }}>Add a department</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
          For when a client has a second, independent project — it gets its own stage and pipeline, grouped under the same company.
        </p>

        <div className="cal-form">
          <div className="cal-form-full">
            <label className="field-label" htmlFor="dept-company">Company</label>
            <input id="dept-company" className="input" autoFocus value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder="e.g. Stellantis" />
          </div>
          <div className="cal-form-full">
            <label className="field-label" htmlFor="dept-name">Department / project name</label>
            <input id="dept-name" className="input" value={form.departmentName} onChange={(e) => set({ departmentName: e.target.value })} placeholder="e.g. New Plant Rollout" />
          </div>
          <div className="cal-form-full">
            <label className="field-label" htmlFor="dept-stage">Starting stage</label>
            <select id="dept-stage" className="input" value={form.stage} onChange={(e) => set({ stage: e.target.value })}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="cal-error" role="alert">{error}</div>}

        <div className="modal-actions cal-modal-actions">
          <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-sm btn-primary">Add department</button>
        </div>
      </form>
    </div>
  );
}
