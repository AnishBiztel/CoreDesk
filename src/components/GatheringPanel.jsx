import { useState } from "react";
import { Download, Plus, Pencil, Trash2, Check, CircleCheck } from "lucide-react";
import { handleEnterSave } from "../lib/helpers";
import { exportToExcel } from "../lib/excel";
import DebouncedField from "./DebouncedField";
import { useConfirm } from "./ConfirmDialog";

// One question row: index, status pill, question text (click or pencil to
// edit), and an answer area that differs by state — a plain text area +
// "Mark Answered" for a pending question, a read-only confirmed line for an
// answered one (click it to reopen for editing). Flat divider rows, not
// boxed cards — matches the rest of CoreDesk's list chrome.
function GatheringRow({ index, item, onUpdate, onDelete }) {
  const confirmDialog = useConfirm();
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [draftAnswer, setDraftAnswer] = useState(item.answer || "");
  const [editingAnswer, setEditingAnswer] = useState(false);
  const answered = !!item.answer.trim();
  const status = answered ? "Answered" : "Pending";

  function markAnswered() {
    if (!draftAnswer.trim()) return;
    onUpdate({ answer: draftAnswer });
    setEditingAnswer(false);
  }

  return (
    <div className="gq-row">
      <div className="gq-row-head">
        <span className="gq-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="status-pill" data-status={status}>{status}</span>
        {editingQuestion ? (
          <DebouncedField
            as="textarea"
            className="input gq-question-input"
            placeholder="What do you need to find out from the client?"
            value={item.question}
            onCommit={(v) => onUpdate({ question: v })}
            onKeyDown={handleEnterSave}
            onBlur={() => setEditingQuestion(false)}
            autoFocus
          />
        ) : (
          <span className="gq-question-text" onClick={() => setEditingQuestion(true)}>
            {item.question || "Untitled question"}
          </span>
        )}
        <div className="gq-row-actions">
          <button className="icon-btn" aria-label="Edit question" onClick={() => setEditingQuestion((v) => !v)}>
            <Pencil size={14} />
          </button>
          <button
            className="icon-btn danger"
            aria-label="Delete question"
            onClick={() => confirmDialog("Delete this question? This can't be undone.").then((ok) => ok && onDelete())}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {answered && !editingAnswer ? (
        <button type="button" className="gq-answer-done" onClick={() => { setDraftAnswer(item.answer); setEditingAnswer(true); }}>
          <CircleCheck size={14} />
          <span>{item.answer}</span>
        </button>
      ) : (
        <div className="gq-answer-row">
          <textarea
            className="input gq-answer-input"
            placeholder="Enter client response or call notes..."
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            rows={1}
          />
          <button type="button" className="btn btn-sm btn-primary gq-mark-answered" onClick={markAnswered} disabled={!draftAnswer.trim()}>
            <Check size={13} /> Mark Answered
          </button>
        </div>
      )}
    </div>
  );
}

export default function GatheringPanel({ clientName, items, onAdd, onUpdate, onDelete }) {
  const [filter, setFilter] = useState("All");
  const [quickAdd, setQuickAdd] = useState("");

  const answeredCount = items.filter((q) => q.answer.trim()).length;
  const pendingCount = items.length - answeredCount;
  const pct = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

  const visible = items.filter((q) => {
    if (filter === "Pending") return !q.answer.trim();
    if (filter === "Answered") return !!q.answer.trim();
    return true;
  });

  function submitQuickAdd() {
    const v = quickAdd.trim();
    if (!v) return;
    onAdd(v);
    setQuickAdd("");
  }

  return (
    <div className="gq-panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Requirement gathering — discovery call questions</div>
        <button
          className="btn btn-sm"
          onClick={() =>
            exportToExcel(
              `${clientName || "client"}-requirement-gathering`,
              "Requirement Gathering",
              items.map((q) => ({ Question: q.question, Answer: q.answer, Status: q.answer.trim() ? "Answered" : "Pending" }))
            )
          }
        >
          <Download size={13} /> Export to Excel
        </button>
      </div>

      <div className="gq-progress-row">
        <div className="gq-progress-label">
          Progress <strong>{answeredCount} of {items.length} answered</strong>
        </div>
        <div className="gq-progress-pct">{pct}%</div>
      </div>
      <div className="gtd-progress-bar" style={{ marginBottom: 14 }}>
        <div className="gtd-progress-fill" style={{ width: pct + "%" }} />
      </div>

      <div className="gq-filters">
        <button className={"gq-chip" + (filter === "All" ? " active" : "")} onClick={() => setFilter("All")}>All {items.length}</button>
        <button className={"gq-chip" + (filter === "Pending" ? " active" : "")} onClick={() => setFilter("Pending")}>Pending {pendingCount}</button>
        <button className={"gq-chip" + (filter === "Answered" ? " active" : "")} onClick={() => setFilter("Answered")}>Answered {answeredCount}</button>
      </div>

      <div className="gq-list">
        {items.length === 0 && <div className="no-items">No questions yet.</div>}
        {items.length > 0 && visible.length === 0 && <div className="no-items">No questions match this filter.</div>}
        {visible.map((item) => {
          const index = items.indexOf(item);
          return (
            <GatheringRow
              key={item.id}
              index={index}
              item={item}
              onUpdate={(patch) => onUpdate(item.id, patch)}
              onDelete={() => onDelete(item.id)}
            />
          );
        })}
      </div>

      <div className="gq-quick-add">
        <Plus size={14} />
        <input
          className="gq-quick-add-input"
          placeholder="Quick-add new question row"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitQuickAdd();
          }}
        />
        <span className="gq-quick-add-hint">Enter ↵</span>
      </div>
    </div>
  );
}
