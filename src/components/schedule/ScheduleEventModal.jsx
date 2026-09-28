import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { EVENT_TYPES } from "../../lib/scheduleApi";
import { PRIORITIES } from "../../lib/constants";
import { timeToMinutes } from "../../lib/dates";

export default function ScheduleEventModal({ initial, isNew, clients, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const allDay = !form.start_time;

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

  function pickClient(id) {
    const client = clients.find((c) => c.id === id);
    // Default the item's priority from the client when linking, so colors make sense straight away.
    set({ client_id: id || null, ...(client && isNew ? { priority: client.priority || "Medium" } : {}) });
  }

  function toggleAllDay(checked) {
    if (checked) set({ start_time: null, end_time: null });
    else set({ start_time: "09:00", end_time: "10:00" });
  }

  function submit(e) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return setError("Give this item a title.");
    if (!form.start_date) return setError("Pick a date.");
    if (form.end_date && form.end_date < form.start_date) return setError("End date can't be before the start date.");
    if (form.start_time && form.end_time) {
      const sameDay = !form.end_date || form.end_date === form.start_date;
      if (sameDay && timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) return setError("End time must be after the start time.");
    }
    onSave({
      ...form,
      title,
      end_date: form.end_date && form.end_date !== form.start_date ? form.end_date : null,
      end_time: form.start_time ? form.end_time || null : null,
    });
  }

  const activeClients = clients.filter((c) => !c.churned || c.id === form.client_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card cal-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="cal-modal-head">
          <div className="modal-title" style={{ marginBottom: 0 }}>{isNew ? "Schedule an item" : "Edit item"}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="cal-form">
          <div className="cal-form-full">
            <label className="field-label" htmlFor="cal-title">Title</label>
            <input id="cal-title" className="input" autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Camera install, POC review, Follow-up call" />
          </div>

          <div>
            <label className="field-label" htmlFor="cal-type">Type</label>
            <select id="cal-type" className="input" value={form.event_type} onChange={(e) => set({ event_type: e.target.value })}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="cal-priority">Priority</label>
            <select id="cal-priority" className="input" value={form.priority} onChange={(e) => set({ priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="cal-form-full">
            <label className="field-label" htmlFor="cal-client">Client</label>
            <select id="cal-client" className="input" value={form.client_id || ""} onChange={(e) => pickClient(e.target.value)}>
              <option value="">No client (internal)</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{(c.name || "Untitled client") + " · " + (c.churned ? "Churned" : c.stage)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="cal-start">Date</label>
            <input id="cal-start" type="date" className="input" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="cal-end">End date <span className="cal-optional">(optional)</span></label>
            <input id="cal-end" type="date" className="input" value={form.end_date || ""} min={form.start_date} onChange={(e) => set({ end_date: e.target.value || null })} />
          </div>

          <label className="cal-check cal-form-full">
            <input type="checkbox" checked={allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
            All day
          </label>

          {!allDay && (
            <>
              <div>
                <label className="field-label" htmlFor="cal-st">Starts</label>
                <input id="cal-st" type="time" className="input" value={form.start_time || ""} onChange={(e) => set({ start_time: e.target.value || null })} />
              </div>
              <div>
                <label className="field-label" htmlFor="cal-et">Ends</label>
                <input id="cal-et" type="time" className="input" value={form.end_time || ""} onChange={(e) => set({ end_time: e.target.value || null })} />
              </div>
            </>
          )}

          <div className="cal-form-full">
            <label className="field-label" htmlFor="cal-notes">Notes</label>
            <textarea id="cal-notes" className="input" rows={3} value={form.notes || ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional details" />
          </div>

          {!isNew && (
            <label className="cal-check cal-form-full">
              <input type="checkbox" checked={!!form.done} onChange={(e) => set({ done: e.target.checked })} />
              Mark as done
            </label>
          )}
        </div>

        {error && <div className="cal-error" role="alert">{error}</div>}

        <div className="modal-actions cal-modal-actions">
          {!isNew && (
            <button type="button" className="btn btn-sm btn-danger" style={{ marginRight: "auto" }} onClick={() => onDelete(form)}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-sm btn-primary">{isNew ? "Add to calendar" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
