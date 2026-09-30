import { useState } from "react";
import {
  ChevronRight, ChevronDown, Circle, CheckCircle2, AlertCircle, Trash2, FileText,
  LayoutGrid, Rocket, Check, ClipboardList, Paperclip, History, Download,
} from "lucide-react";
import { STAGES, SPEC_STATUSES, PRIORITIES, STAGE_COLORS, SPEC_COLORS, PRIORITY_COLORS, GATHERING_COLORS, STUCK_STAGE_DAYS } from "../lib/constants";
import { handleEnterSave, isOverdue, daysSince } from "../lib/helpers";
import IssueAdder from "./IssueAdder";
import CommentThread from "./CommentThread";
import ActivityFeed from "./ActivityFeed";
import FilesPanel from "./FilesPanel";
import DebouncedField from "./DebouncedField";
import { exportToExcel } from "../lib/excel";
import { useConfirm } from "./ConfirmDialog";

export default function ClientDetail({
  client,
  userEmail,
  isAdmin,
  updateClient,
  addSpec,
  updateSpec,
  deleteSpec,
  addGatheringQuestion,
  updateGatheringItem,
  deleteGatheringItem,
  addIssue,
  toggleIssue,
  deleteIssue,
  updateGtdStep,
  toggleGtdStep,
  onDeleteClient,
}) {
  const [tab, setTab] = useState("overview");
  const [expandedSpec, setExpandedSpec] = useState(null);
  const [expandedGathering, setExpandedGathering] = useState(null);
  const confirmDialog = useConfirm();

  const c = client;
  const stageDur = daysSince(c.stageEnteredAt);
  const stuck = stageDur !== null && stageDur > STUCK_STAGE_DAYS && !c.churned;

  return (
    <div className="main-inner">
      <div className="client-header">
        <DebouncedField
          className="name-input"
          placeholder="Client name"
          value={c.name}
          onCommit={(v) => updateClient(c.id, { name: v })}
          onKeyDown={handleEnterSave}
        />
        <div className="meta-row meta-row-fill">
          <div className="meta-field">
            <label>Contact</label>
            <DebouncedField placeholder="Name, role" value={c.contact} onCommit={(v) => updateClient(c.id, { contact: v })} onKeyDown={handleEnterSave} />
          </div>
          <div className="meta-field">
            <label>Industry / use case</label>
            <DebouncedField placeholder="e.g. automotive QC" value={c.industry} onCommit={(v) => updateClient(c.id, { industry: v })} onKeyDown={handleEnterSave} />
          </div>
          <div className="meta-field">
            <label>Last contact</label>
            <input type="date" value={c.lastContact} onChange={(e) => updateClient(c.id, { lastContact: e.target.value })} />
          </div>
          <div className="meta-field">
            <label>Priority</label>
            <select value={c.priority || "Medium"} onChange={(e) => updateClient(c.id, { priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overview-box">
          <label>High-level overview</label>
          <DebouncedField
            as="textarea"
            className="overview-textarea"
            placeholder="One or two lines on where this client stands overall — useful for a quick catch-up before a call."
            value={c.overview}
            onCommit={(v) => updateClient(c.id, { overview: v })}
            onKeyDown={handleEnterSave}
          />
        </div>
      </div>

      <div className="pipeline">
        {STAGES.map((stage, i) => {
          const currentIdx = STAGES.indexOf(c.stage);
          const isDone = i < currentIdx || (i === currentIdx && !c.churned);
          const isCurrent = i === currentIdx;
          return (
            <div className="pipeline-node-wrap" key={stage} style={{ flex: 1 }}>
              <div className="pipeline-node" onClick={() => updateClient(c.id, { stage, churned: false })}>
                <div className={"pipeline-dot" + (isDone ? " done" : "") + (isCurrent ? " current" : "")} />
                <div className={"pipeline-label" + (isCurrent ? " active" : "")}>{stage}</div>
              </div>
              {i < STAGES.length - 1 && (
                <div className={"pipeline-track" + (i < currentIdx - 1 ? " done" : i === currentIdx - 1 ? " active" : "")} />
              )}
            </div>
          );
        })}
      </div>

      <div className="stage-meta-row">
        <div className={"churn-toggle" + (c.churned ? " active" : "")} onClick={() => updateClient(c.id, { churned: !c.churned })}>
          {c.churned ? <AlertCircle size={13} /> : <Circle size={13} />}
          {c.churned ? "Marked as churned — click to undo" : "Mark as churned"}
        </div>
        {stageDur !== null && (
          <span className={"stage-duration" + (stuck ? " stuck" : "")}>
            {stuck ? "⚠ " : ""}{stageDur} day{stageDur === 1 ? "" : "s"} in current stage
          </span>
        )}
      </div>

      <div className="tabs">
        <button className={"tab-btn" + (tab === "overview" ? " active" : "")} onClick={() => setTab("overview")}>
          <LayoutGrid size={14} /> Overview
        </button>
        <button className={"tab-btn" + (tab === "gathering" ? " active" : "")} onClick={() => setTab("gathering")}>
          <ClipboardList size={14} /> Gathering ({(c.gathering || []).filter((q) => q.answer.trim()).length}/{(c.gathering || []).length})
        </button>
        <button className={"tab-btn" + (tab === "specs" ? " active" : "")} onClick={() => setTab("specs")}>
          <FileText size={14} /> Specs ({c.specs.length})
        </button>
        <button className={"tab-btn" + (tab === "gtd" ? " active" : "")} onClick={() => setTab("gtd")}>
          <Rocket size={14} /> GTD ({(c.gtd || []).filter((s) => s.done).length}/{(c.gtd || []).length})
        </button>
        <button className={"tab-btn" + (tab === "files" ? " active" : "")} onClick={() => setTab("files")}>
          <Paperclip size={14} /> Files
        </button>
        <button className={"tab-btn" + (tab === "activity" ? " active" : "")} onClick={() => setTab("activity")}>
          <History size={14} /> Activity
        </button>
      </div>

      {tab === "overview" && (
        <>
          <div className="section">
            <div className="section-title">Next action</div>
            <div className="meta-row" style={{ marginTop: 0 }}>
              <div className="meta-field" style={{ flex: 1 }}>
                <label aria-hidden="true" style={{ visibility: "hidden" }}>Next action</label>
                <DebouncedField aria-label="Next action" placeholder="e.g. send POC results deck" value={c.nextAction} onCommit={(v) => updateClient(c.id, { nextAction: v })} onKeyDown={handleEnterSave} style={{ minWidth: 280 }} />
              </div>
              <div className="meta-field">
                <label>Due</label>
                <input type="date" value={c.nextActionDate} onChange={(e) => updateClient(c.id, { nextActionDate: e.target.value })} />
              </div>
              {isOverdue(c.nextActionDate) && !c.churned && (
                <span className="mono overdue-flag" style={{ alignSelf: "center", fontSize: 11 }}>⚠ overdue</span>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-title">Issues</div>
            {c.issues.length === 0 && <div className="no-items">No issues logged.</div>}
            {c.issues.map((issue) => (
              <div key={issue.id} className={"issue-row" + (issue.resolved ? " resolved" : "")}>
                <span onClick={() => toggleIssue(c.id, issue.id)} style={{ cursor: "pointer", display: "flex" }} aria-label={issue.resolved ? "Mark as open" : "Mark as resolved"}>
                  {issue.resolved ? <CheckCircle2 size={15} color="var(--accent)" /> : <Circle size={15} color="var(--muted-2)" />}
                </span>
                <span style={{ flex: 1 }}>{issue.text}</span>
                {issue.resolved && <span className="resolved-badge">Resolved</span>}
                <button className="icon-btn danger" onClick={() => deleteIssue(c.id, issue.id)} aria-label="Delete issue">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <IssueAdder onAdd={(text) => addIssue(c.id, text)} />
          </div>

          <div className="section">
            <CommentThread clientId={c.id} targetType="client" targetId={c.id} userEmail={userEmail} canDelete={isAdmin} />
          </div>
        </>
      )}

      {tab === "gathering" && (
        <div className="section">
          {(() => {
            const items = c.gathering || [];
            const answered = items.filter((q) => q.answer.trim()).length;
            const pct = items.length ? Math.round((answered / items.length) * 100) : 0;
            return (
              <>
                <div className="page-header" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Requirement gathering — discovery call questions</div>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      exportToExcel(
                        `${c.name || "client"}-requirement-gathering`,
                        "Requirement Gathering",
                        items.map((q) => ({ Question: q.question, Answer: q.answer, Status: q.answer.trim() ? "Answered" : "Pending" }))
                      )
                    }
                  >
                    <Download size={13} /> Export to Excel
                  </button>
                </div>
                <div className="gtd-progress-wrap">
                  <div className="gtd-progress-bar"><div className="gtd-progress-fill" style={{ width: pct + "%" }} /></div>
                  <div className="gtd-progress-label">{answered} of {items.length} answered ({pct}%)</div>
                </div>
                <button className="btn btn-ghost btn-dashed" style={{ width: "100%", justifyContent: "center" }} onClick={() => addGatheringQuestion(c.id)}>+ Add question</button>
                <div style={{ marginTop: 12 }}>
                  {items.length === 0 && <div className="no-items">No questions yet.</div>}
                  {items.map((item) => {
                    const open = expandedGathering === item.id;
                    const status = item.answer.trim() ? "Answered" : "Pending";
                    return (
                      <div className="spec-card" key={item.id}>
                        <div className="spec-card-head" onClick={() => setExpandedGathering(open ? null : item.id)}>
                          <div className="spec-card-title">
                            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            <span>{item.question || "Untitled question"}</span>
                          </div>
                          <div className="spec-card-head-right">
                            <span className="pill" style={{ "--pill-color": GATHERING_COLORS[status] }}>{status}</span>
                            <button
                              className="icon-btn danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDialog("Delete this question? This can't be undone.").then((ok) => ok && deleteGatheringItem(c.id, item.id));
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {open && (
                          <div className="spec-body">
                            <div>
                              <div className="field-label">Question</div>
                              <DebouncedField as="textarea" placeholder="What do you need to find out from the client?" value={item.question} onCommit={(v) => updateGatheringItem(c.id, item.id, { question: v })} onKeyDown={handleEnterSave} />
                            </div>
                            <div>
                              <div className="field-label">Answer</div>
                              <DebouncedField as="textarea" placeholder="What the client told you" value={item.answer} onCommit={(v) => updateGatheringItem(c.id, item.id, { answer: v })} onKeyDown={handleEnterSave} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tab === "specs" && (
        <div className="section">
          <div className="section-title">Requirements &amp; specs</div>
          <button className="btn btn-ghost btn-dashed" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={() => { addSpec(c.id); }}>+ Add spec</button>
          {c.specs.length === 0 && <div className="no-items">No specs yet.</div>}
          {c.specs.map((spec) => {
            const open = expandedSpec === spec.id;
            return (
              <div className="spec-card" key={spec.id}>
                <div className="spec-card-head" onClick={() => setExpandedSpec(open ? null : spec.id)}>
                  <div className="spec-card-title">
                    {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span>{spec.problem ? spec.problem.slice(0, 60) + (spec.problem.length > 60 ? "…" : "") : "Untitled spec"}</span>
                  </div>
                  <div className="spec-card-head-right">
                    <span className="pill" style={{ "--pill-color": SPEC_COLORS[spec.status] }}>{spec.status}</span>
                    <button
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDialog("Delete this spec? This can't be undone.").then((ok) => ok && deleteSpec(c.id, spec.id));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="spec-body">
                    <div>
                      <div className="field-label">Problem statement</div>
                      <DebouncedField as="textarea" placeholder="What does the client actually need, in plain terms?" value={spec.problem} onCommit={(v) => updateSpec(c.id, spec.id, { problem: v })} onKeyDown={handleEnterSave} />
                    </div>
                    <div>
                      <div className="field-label">Technical constraints</div>
                      <DebouncedField as="textarea" placeholder="Accuracy needed, environment, integration points, timelines…" value={spec.constraints} onCommit={(v) => updateSpec(c.id, spec.id, { constraints: v })} onKeyDown={handleEnterSave} />
                    </div>
                    <div>
                      <div className="field-label">Scope — in</div>
                      <DebouncedField as="textarea" placeholder="What we're building for this" value={spec.scopeIn} onCommit={(v) => updateSpec(c.id, spec.id, { scopeIn: v })} onKeyDown={handleEnterSave} />
                    </div>
                    <div>
                      <div className="field-label">Scope — out</div>
                      <DebouncedField as="textarea" placeholder="What we're explicitly not doing, and why" value={spec.scopeOut} onCommit={(v) => updateSpec(c.id, spec.id, { scopeOut: v })} onKeyDown={handleEnterSave} />
                    </div>
                    <div className="spec-meta-row">
                      <select className="input" style={{ width: "auto" }} value={spec.status} onChange={(e) => updateSpec(c.id, spec.id, { status: e.target.value })}>
                        {SPEC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <DebouncedField className="input" style={{ width: 140 }} placeholder="Owner" value={spec.owner} onCommit={(v) => updateSpec(c.id, spec.id, { owner: v })} onKeyDown={handleEnterSave} />
                      <span className="updated-note">updated {new Date(spec.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <CommentThread clientId={c.id} targetType="spec" targetId={spec.id} userEmail={userEmail} canDelete={isAdmin} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "gtd" && (
        <div className="section">
          {(() => {
            const steps = c.gtd || [];
            const done = steps.filter((s) => s.done).length;
            const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
            return (
              <>
                <div className="section-title">Go-To-Deployment — end-to-end rollout checklist</div>
                <div className="gtd-progress-wrap">
                  <div className="gtd-progress-bar"><div className="gtd-progress-fill" style={{ width: pct + "%" }} /></div>
                  <div className="gtd-progress-label">{done} of {steps.length} steps complete ({pct}%)</div>
                </div>
                {steps.map((step) => (
                  <div className="gtd-step" key={step.id}>
                    <div className={"gtd-checkbox" + (step.done ? " checked" : "")} onClick={() => toggleGtdStep(c.id, step.id)}>
                      {step.done && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <div className="gtd-step-body">
                      <div className="gtd-step-top">
                        <span className={"gtd-step-label" + (step.done ? " done" : "")} onClick={() => toggleGtdStep(c.id, step.id)} style={{ cursor: "pointer" }}>{step.label}</span>
                        {step.completedAt && <span className="gtd-step-date">{new Date(step.completedAt).toLocaleDateString()}</span>}
                      </div>
                      <DebouncedField className="input gtd-note-input" placeholder="Notes — blockers, dates, who's handling it…" value={step.note} onCommit={(v) => updateGtdStep(c.id, step.id, { note: v })} onKeyDown={handleEnterSave} />
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}

      {tab === "files" && <FilesPanel clientId={c.id} userEmail={userEmail} />}
      {tab === "activity" && <ActivityFeed clientId={c.id} />}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            confirmDialog("Move this client to Trash? You can restore it later from the Trash panel.", { confirmLabel: "Move to Trash" }).then(
              (ok) => ok && onDeleteClient(c.id)
            );
          }}
        >
          <Trash2 size={13} /> Delete client
        </button>
      </div>
    </div>
  );
}
