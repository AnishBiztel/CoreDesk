import { useState, useMemo } from "react";
import { LayoutGrid, Table2, Download, AlertTriangle, ChevronRight } from "lucide-react";
import { STAGES, STAGE_COLORS, PRIORITY_COLORS, STUCK_STAGE_DAYS } from "../lib/constants";
import { daysSince, isOverdue, toCSV, downloadBlob } from "../lib/helpers";
import { computeHealthScore } from "../lib/health";
import ProjectStatusChart from "./ProjectStatusChart";

function stageDuration(c) {
  return daysSince(c.stageEnteredAt);
}

export default function Dashboard({ allClients, filtered, onSelect, onAddClient, initialView }) {
  const [view, setView] = useState(initialView || "kanban");
  const [sortKey, setSortKey] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const kpis = useMemo(() => {
    const active = allClients.filter((c) => !c.churned);
    const issues = active.reduce((sum, c) => sum + c.issues.filter((i) => !i.resolved).length, 0);
    const pending = allClients.reduce(
      (sum, c) => sum + c.specs.filter((s) => s.status === "Draft" || s.status === "Reviewed with Eng").length,
      0
    );
    // Pipeline velocity: share of active clients that have moved past the first
    // stage — a rough read on how much of the pipeline is actually progressing.
    const pastLead = active.filter((c) => c.stage !== "Lead").length;
    const velocity = active.length ? Math.round((pastLead / active.length) * 100) : 0;
    return { total: allClients.length, active: active.length, issues, pending, velocity };
  }, [allClients]);

  // "Needs attention": every active client whose health score has dropped into
  // Watch or At risk, worst first — so the thing most likely to slip is on top.
  const needsAttention = useMemo(() => {
    return allClients
      .filter((c) => !c.churned)
      .map((c) => ({ client: c, health: computeHealthScore(c) }))
      .filter((x) => x.health.band === "watch" || x.health.band === "critical")
      .sort((a, b) => a.health.score - b.health.score);
  }, [allClients]);

  const columns = [...STAGES, "Churned"];
  const byStage = (stage) =>
    filtered.filter((c) => (stage === "Churned" ? c.churned : !c.churned && c.stage === stage));

  function sortedRows() {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "stage":
          av = a.churned ? "Churned" : a.stage;
          bv = b.churned ? "Churned" : b.stage;
          break;
        case "priority":
          av = a.priority;
          bv = b.priority;
          break;
        case "daysInStage":
          av = stageDuration(a) ?? -1;
          bv = stageDuration(b) ?? -1;
          break;
        case "nextActionDate":
          av = a.nextActionDate || "9999";
          bv = b.nextActionDate || "9999";
          break;
        default:
          av = a.updatedAt || "";
          bv = b.updatedAt || "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCSV() {
    const csv = toCSV(filtered, [
      { label: "Name", value: (c) => c.name },
      { label: "Contact", value: (c) => c.contact },
      { label: "Industry", value: (c) => c.industry },
      { label: "Stage", value: (c) => (c.churned ? "Churned" : c.stage) },
      { label: "Priority", value: (c) => c.priority },
      { label: "Next action", value: (c) => c.nextAction },
      { label: "Due", value: (c) => c.nextActionDate },
      { label: "Last contact", value: (c) => c.lastContact },
      { label: "Days in stage", value: (c) => stageDuration(c) ?? "" },
      { label: "Open issues", value: (c) => c.issues.filter((i) => !i.resolved).length },
      { label: "Specs", value: (c) => c.specs.length },
    ]);
    downloadBlob(csv, "coredesk-clients-" + new Date().toISOString().slice(0, 10) + ".csv", "text/csv");
  }

  return (
    <div className="main-inner">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>Clients</span> <span className="breadcrumb-sep">/</span> <span className="breadcrumb-current">Dashboard</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={onAddClient}>+ New client</button>
          <div className="view-toggle">
            <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
              <LayoutGrid size={13} /> Board
            </button>
            <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>
              <Table2 size={13} /> Table
            </button>
          </div>
          <button className="btn btn-sm" onClick={exportCSV}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card kpi-card-neutral">
          <div className="kpi-num">{kpis.total}</div>
          <div className="kpi-label">Clients</div>
          <div className="kpi-bar" style={{ background: "var(--accent)" }} />
        </div>
        <div className="kpi-card kpi-card-accent">
          <div className="kpi-num">{kpis.active}</div>
          <div className="kpi-label">Active</div>
          <div className="kpi-bar" style={{ background: "var(--green)" }} />
        </div>
        <div className="kpi-card kpi-card-red">
          <div className="kpi-num">{kpis.issues}</div>
          <div className="kpi-label">Issues</div>
          <div className="kpi-bar" style={{ background: "var(--red)" }} />
        </div>
        <div className="kpi-card kpi-card-amber">
          <div className="kpi-num">{kpis.pending}</div>
          <div className="kpi-label">Pending</div>
          <div className="kpi-bar" style={{ background: "var(--amber)" }} />
        </div>
        <div className="kpi-card kpi-card-accent">
          <div className="kpi-num">{kpis.velocity}%</div>
          <div className="kpi-label">Pipeline velocity</div>
          <div className="kpi-bar" style={{ background: "var(--accent)" }} />
        </div>
      </div>

      <ProjectStatusChart clients={allClients} />

      {needsAttention.length > 0 && (
        <div className="attention-panel">
          <div className="attention-panel-head">
            <AlertTriangle size={14} />
            Needs attention
            <span className="attention-panel-count">{needsAttention.length}</span>
          </div>
          <div className="attention-list">
            {needsAttention.map(({ client: c, health }) => (
              <div className="attention-row" key={c.id} onClick={() => onSelect(c.id)}>
                <span className="health-badge" data-band={health.band}>{health.label} · {health.score}</span>
                <span className="attention-row-name">
                  {c.name || "Untitled client"}
                  {c.departmentName && <span className="attention-row-dept"> — {c.departmentName}</span>}
                </span>
                <span className="attention-row-reason">{health.reasons.join(" · ")}</span>
                <ChevronRight size={14} className="attention-row-arrow" />
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "kanban" ? (
        <div className="kanban">
          {columns.map((stage) => {
            const cards = byStage(stage);
            return (
              <div className="kanban-col" key={stage}>
                <div className="kanban-col-head">
                  <div className="kanban-col-title">
                    <span className="kanban-col-dot" style={{ background: STAGE_COLORS[stage] }} />
                    {stage}
                  </div>
                  <span className="kanban-col-count">{cards.length}</span>
                </div>
                <div className="kanban-cards">
                  {cards.length === 0 && <div className="kanban-empty-col">No clients</div>}
                  {cards.map((c) => {
                    const dur = stageDuration(c);
                    const stuck = dur !== null && dur > STUCK_STAGE_DAYS && !c.churned;
                    const openIssues = c.issues.filter((i) => !i.resolved).length;
                    return (
                      <div className="kanban-card" key={c.id} onClick={() => onSelect(c.id)}>
                        <div className="kanban-card-name">
                          <span className="priority-dot" style={{ background: PRIORITY_COLORS[c.priority] }} />
                          {c.name || "Untitled client"}
                        </div>
                        <div className="kanban-card-meta">
                          {dur !== null && <span className={stuck ? "stuck-flag" : ""}>{dur}d in stage</span>}
                          {isOverdue(c.nextActionDate) && !c.churned && <span className="overdue-flag">overdue</span>}
                          {openIssues > 0 && <span>{openIssues} open</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")}>Client</th>
                <th onClick={() => toggleSort("stage")}>Stage</th>
                <th onClick={() => toggleSort("priority")}>Priority</th>
                <th onClick={() => toggleSort("daysInStage")}>Days in stage</th>
                <th onClick={() => toggleSort("nextActionDate")}>Next action / due</th>
                <th>Open issues</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows().map((c) => {
                const dur = stageDuration(c);
                return (
                  <tr key={c.id} onClick={() => onSelect(c.id)}>
                    <td style={{ fontWeight: 600 }}>{c.name || "Untitled client"}</td>
                    <td>
                      <span className="stage-pill" data-stage={c.churned ? "Churned" : c.stage}>
                        {c.churned ? "Churned" : c.stage}
                      </span>
                    </td>
                    <td>{c.priority}</td>
                    <td className="mono">{dur !== null ? dur + "d" : "—"}</td>
                    <td>
                      {c.nextAction || <span style={{ color: "var(--muted-2)" }}>—</span>}
                      {c.nextActionDate && (
                        <span className={"mono badge " + (isOverdue(c.nextActionDate) ? "badge-red" : "badge-muted")} style={{ marginLeft: 8 }}>
                          {c.nextActionDate}
                        </span>
                      )}
                    </td>
                    <td>{c.issues.filter((i) => !i.resolved).length}</td>
                  </tr>
                );
              })}
              {sortedRows().length === 0 && (
                <tr>
                  <td colSpan={6} className="no-items">No clients match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
