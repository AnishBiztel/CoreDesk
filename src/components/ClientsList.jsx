import { useState } from "react";
import { Download } from "lucide-react";
import { STAGE_COLORS } from "../lib/constants";
import { daysSince, isOverdue, toCSV, downloadBlob } from "../lib/helpers";

function stageDuration(c) {
  return daysSince(c.stageEnteredAt);
}

export default function ClientsList({ filtered, onSelect, onAddClient }) {
  const [sortKey, setSortKey] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

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
        <span>Home</span> <span className="breadcrumb-sep">/</span> <span className="breadcrumb-current">Clients</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={onAddClient}>+ New client</button>
          <button className="btn btn-sm" onClick={exportCSV}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

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
                    <span className="stage-pill" data-stage={c.churned ? "Churned" : c.stage} style={{ background: c.churned ? STAGE_COLORS.Churned : STAGE_COLORS[c.stage] }}>
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
    </div>
  );
}
