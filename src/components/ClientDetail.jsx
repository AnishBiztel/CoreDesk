import { useState, useEffect, useRef } from "react";
import {
  ChevronRight, ChevronDown, Trash2, Check, Download, X, Calendar,
} from "lucide-react";
import { STAGES, SPEC_STATUSES, PRIORITIES, SPEC_COLORS, STUCK_STAGE_DAYS } from "../lib/constants";
import { handleEnterSave, isOverdue, daysSince, timeAgo } from "../lib/helpers";
import IssueAdder from "./IssueAdder";
import CommentThread from "./CommentThread";
import ActivityFeed from "./ActivityFeed";
import FilesPanel from "./FilesPanel";
import DebouncedField from "./DebouncedField";
import { exportToExcel } from "../lib/excel";
import { useConfirm } from "./ConfirmDialog";
import Pill from "./Pill";
import PropertyRow from "./PropertyRow";
import StageTrack from "./StageTrack";
import OverflowMenu from "./OverflowMenu";

function openPicker(ref) {
  const el = ref.current;
  if (!el) return;
  if (typeof el.showPicker === "function") {
    try {
      el.showPicker();
      return;
    } catch {
      /* fall through to focus */
    }
  }
  el.focus();
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Click-to-edit title: plain heading until clicked, then a borderless input
// that saves on Enter/blur and reverts on Escape.
function EditableTitle({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        className="dp-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onCommit(draft);
            setEditing(false);
          }
          if (e.key === "Escape") {
            // Stop this from also bubbling up to the drawer's own Escape
            // handler — cancelling the title edit shouldn't close the panel.
            e.stopPropagation();
            setDraft(value || "");
            setEditing(false);
          }
        }}
        onBlur={() => {
          onCommit(draft);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <h1
      className="dp-title"
      onClick={() => {
        setDraft(value || "");
        setEditing(true);
      }}
    >
      {value || "Untitled client"}
    </h1>
  );
}

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
  onAddDepartment,
  onClose,
  forceTab,
  onForceTabApplied,
}) {
  const [tab, setTab] = useState("overview");

  // When a caller wants this panel to open straight on a specific tab (e.g. a
  // freshly-created project should land on Gathering, not Overview), it passes
  // forceTab for that one client. Apply it once, then tell the caller to clear it
  // so a later re-selection of the same client doesn't keep forcing the tab.
  useEffect(() => {
    if (forceTab) {
      setTab(forceTab);
      onForceTabApplied && onForceTabApplied();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceTab, client.id]);
  const [expandedSpec, setExpandedSpec] = useState(null);
  const [expandedGathering, setExpandedGathering] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const nextActionDateRef = useRef(null);
  const confirmDialog = useConfirm();

  const c = client;
  const stageDur = daysSince(c.stageEnteredAt);
  const currentIdx = STAGES.indexOf(c.stage);
  const sinceContact = c.lastContact ? daysSince(c.lastContact) : null;
  const openIssues = c.issues.filter((i) => !i.resolved);
  const resolvedIssues = c.issues.filter((i) => i.resolved);
  const overdueNextAction = isOverdue(c.nextActionDate) && !c.churned;
  const hasNextAction = !!(c.nextAction || c.nextActionDate);

  function markNextActionComplete() {
    updateClient(
      c.id,
      { nextAction: "", nextActionDate: "" },
      { action: "next_action_completed", detail: `marked "${c.nextAction || "the next action"}" complete` }
    );
  }

  const gatheringItems = c.gathering || [];
  const gatheringAnswered = gatheringItems.filter((q) => q.answer.trim()).length;
  const gtdSteps = c.gtd || [];
  const gtdDone = gtdSteps.filter((s) => s.done).length;

  const primaryAction = c.churned
    ? { label: "Restore client", onClick: () => updateClient(c.id, { churned: false }) }
    : { label: "Add project", onClick: () => onAddDepartment?.(c.companyId, c.name) };

  const overflowItems = c.churned
    ? [
        {
          label: "Delete client",
          danger: true,
          onClick: () => {
            confirmDialog("Move this client to Trash? You can restore it later from the Trash panel.", { confirmLabel: "Move to Trash" }).then(
              (ok) => ok && onDeleteClient(c.id)
            );
          },
        },
      ]
    : [
        { label: "Mark as churned", onClick: () => updateClient(c.id, { churned: true }) },
        {
          label: "Delete client",
          danger: true,
          onClick: () => {
            confirmDialog("Move this client to Trash? You can restore it later from the Trash panel.", { confirmLabel: "Move to Trash" }).then(
              (ok) => ok && onDeleteClient(c.id)
            );
          },
        },
      ];

  return (
    <div className="dp-panel">
      <header className="dp-sticky-header">
        <nav className="dp-breadcrumb" aria-label="Breadcrumb">
          <span>Clients</span>
          <ChevronRight size={13} className="dp-breadcrumb-sep" />
          <span className="dp-breadcrumb-current">{c.name || "Untitled client"}</span>
        </nav>
        <div className="dp-header-actions">
          <button type="button" className="dp-btn-primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
          <OverflowMenu items={overflowItems} />
          {onClose && (
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="dp-body">
        <div className="dp-title-row">
          <EditableTitle value={c.name} onCommit={(v) => updateClient(c.id, { name: v })} />
          {c.churned ? <Pill tone="danger">Churned</Pill> : <Pill>{c.stage}</Pill>}
        </div>
        {c.churned && (
          <div className="dp-title-meta">
            Churned{stageDur !== null ? ` ${stageDur} day${stageDur === 1 ? "" : "s"} ago` : ""}
            {c.lastContact ? ` · Last contact ${fmtDate(c.lastContact)}` : ""}
          </div>
        )}

        <StageTrack
          stages={STAGES}
          currentIndex={currentIdx}
          churned={c.churned}
          onSelect={(stage) => updateClient(c.id, { stage, churned: false })}
        />

        <div className="dp-columns">
          <div className="dp-col-main">
            <div className="dp-section">
              <div className="dp-section-label">Next action</div>
              <div className="dp-next-action-row">
                <button
                  type="button"
                  className={"dp-checkbox" + (!hasNextAction ? " disabled" : "")}
                  disabled={!hasNextAction}
                  onClick={markNextActionComplete}
                  aria-label="Mark next action complete"
                />
                <DebouncedField
                  className="dp-plain-input"
                  placeholder="Add a next action"
                  value={c.nextAction || ""}
                  onCommit={(v) => updateClient(c.id, { nextAction: v })}
                  onKeyDown={handleEnterSave}
                />
              </div>
              <div className="dp-next-action-meta">
                <button type="button" className="dp-inline-date" onClick={() => openPicker(nextActionDateRef)}>
                  Due {c.nextActionDate ? fmtDate(c.nextActionDate) : "—"}
                  <input
                    ref={nextActionDateRef}
                    type="date"
                    className="dp-prop-date-input"
                    value={c.nextActionDate || ""}
                    onChange={(e) => updateClient(c.id, { nextActionDate: e.target.value })}
                    tabIndex={-1}
                  />
                </button>
                {overdueNextAction && <span className="dp-overdue-text">· overdue</span>}
              </div>
            </div>

            <div className="dp-divider" />

            <div className="dp-section">
              <div className="dp-section-label">Summary</div>
              <DebouncedField
                as="textarea"
                className="dp-plain-textarea"
                placeholder="Add a summary"
                value={c.overview || ""}
                onCommit={(v) => updateClient(c.id, { overview: v })}
                onKeyDown={handleEnterSave}
              />
            </div>

            <div className="dp-divider" />

            <div className="dp-tabs">
              <button className={"dp-tab" + (tab === "overview" ? " active" : "")} onClick={() => setTab("overview")}>Overview</button>
              <button className={"dp-tab" + (tab === "gathering" ? " active" : "")} onClick={() => setTab("gathering")}>
                Gathering{gatheringItems.length > 0 ? ` ${gatheringAnswered}/${gatheringItems.length}` : ""}
              </button>
              <button className={"dp-tab" + (tab === "specs" ? " active" : "")} onClick={() => setTab("specs")}>
                Specs{c.specs.length > 0 ? ` ${c.specs.length}` : ""}
              </button>
              <button className={"dp-tab" + (tab === "gtd" ? " active" : "")} onClick={() => setTab("gtd")}>
                GTD{gtdSteps.length > 0 ? ` ${gtdDone}/${gtdSteps.length}` : ""}
              </button>
              <button className={"dp-tab" + (tab === "files" ? " active" : "")} onClick={() => setTab("files")}>Files</button>
              <button className={"dp-tab" + (tab === "activity" ? " active" : "")} onClick={() => setTab("activity")}>Activity</button>
            </div>

            {tab === "overview" && (
              <>
                <div className="dp-section">
                  <div className="dp-section-head">
                    <span className="dp-section-label">Blockers</span>
                    {openIssues.length > 0 && <Pill tone="danger">{openIssues.length}</Pill>}
                  </div>

                  {openIssues.length === 0 && resolvedIssues.length === 0 && (
                    <div className="dp-muted-line">No blockers.</div>
                  )}
                  {openIssues.length === 0 && resolvedIssues.length > 0 && (
                    <div className="dp-muted-line">
                      No open blockers.{" "}
                      <button type="button" className="dp-link" onClick={() => setShowResolved((v) => !v)}>
                        {showResolved ? "Hide" : `Show ${resolvedIssues.length} resolved`}
                      </button>
                    </div>
                  )}

                  {openIssues.map((issue) => (
                    <div key={issue.id} className="dp-issue-row">
                      <div className="dp-issue-top">
                        <span className="dp-issue-text">{issue.text}</span>
                        <button className="icon-btn danger" onClick={() => deleteIssue(c.id, issue.id)} aria-label="Delete blocker">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="dp-issue-sub">
                        Reported {timeAgo(issue.createdAt)} ·{" "}
                        <button type="button" className="dp-link" onClick={() => toggleIssue(c.id, issue.id)}>Resolve</button>
                      </div>
                    </div>
                  ))}

                  {showResolved && resolvedIssues.length > 0 && (
                    <div className="dp-resolved-list">
                      {openIssues.length > 0 && (
                        <button type="button" className="dp-link" style={{ marginBottom: 8 }} onClick={() => setShowResolved(false)}>
                          Hide resolved
                        </button>
                      )}
                      {resolvedIssues.map((issue) => (
                        <div key={issue.id} className="dp-issue-row resolved">
                          <div className="dp-issue-top">
                            <span className="dp-issue-text"><Check size={13} className="dp-resolved-check" /> {issue.text}</span>
                            <button className="icon-btn danger" onClick={() => deleteIssue(c.id, issue.id)} aria-label="Delete blocker">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="dp-issue-sub">
                            Reported {timeAgo(issue.createdAt)} ·{" "}
                            <button type="button" className="dp-link" onClick={() => toggleIssue(c.id, issue.id)}>Reopen</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <IssueAdder onAdd={(text) => addIssue(c.id, text)} />
                </div>

                <div className="dp-divider" />
                <CommentThread clientId={c.id} targetType="client" targetId={c.id} userEmail={userEmail} canDelete={isAdmin} />
              </>
            )}

            {tab === "gathering" && (
              <div className="section">
                {(() => {
                  const items = gatheringItems;
                  const pct = items.length ? Math.round((gatheringAnswered / items.length) * 100) : 0;
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
                        <div className="gtd-progress-label">{gatheringAnswered} of {items.length} answered ({pct}%)</div>
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
                                  <span className="status-pill" data-status={status}>{status}</span>
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
                  const steps = gtdSteps;
                  const pct = steps.length ? Math.round((gtdDone / steps.length) * 100) : 0;
                  return (
                    <>
                      <div className="section-title">Go-To-Deployment — end-to-end rollout checklist</div>
                      <div className="gtd-progress-wrap">
                        <div className="gtd-progress-bar"><div className="gtd-progress-fill" style={{ width: pct + "%" }} /></div>
                        <div className="gtd-progress-label">{gtdDone} of {steps.length} steps complete ({pct}%)</div>
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
          </div>

          <div className="dp-col-side">
            <PropertyRow
              label="Stage"
              type="select"
              value={c.churned ? "Churned" : c.stage}
              options={c.churned ? ["Churned"] : STAGES}
              disabled={c.churned}
              onChange={(v) => updateClient(c.id, { stage: v })}
            />
            <PropertyRow
              label="Priority"
              type="select"
              value={c.priority || "Medium"}
              options={PRIORITIES}
              onChange={(v) => updateClient(c.id, { priority: v })}
            />
            <PropertyRow
              label="Industry"
              value={c.industry}
              placeholder="Add industry & use case"
              onCommit={(v) => updateClient(c.id, { industry: v })}
            />
            <PropertyRow
              label="Contact"
              value={c.contact}
              placeholder="Add contact"
              onCommit={(v) => updateClient(c.id, { contact: v })}
            />
            <PropertyRow
              label="Last contact"
              type="date"
              value={c.lastContact}
              formatted={c.lastContact ? fmtDate(c.lastContact) + (sinceContact !== null ? ` (${sinceContact === 0 ? "today" : sinceContact + "d ago"})` : "") : ""}
              onCommit={(v) => updateClient(c.id, { lastContact: v })}
            />
            <PropertyRow
              label="Account ID"
              value={c.accountCode}
              placeholder="Add account ID"
              mono
              onCommit={(v) => updateClient(c.id, { accountCode: v })}
            />
            <PropertyRow
              label="Department"
              type="readonly"
              value={c.departmentName}
            />
            <PropertyRow
              label="Created"
              type="readonly"
              value={c.createdAt}
              formatted={c.createdAt ? fmtDate(c.createdAt.slice(0, 10)) : ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
