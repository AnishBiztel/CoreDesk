import { useState } from "react";
import { Search, Download, Upload, Trash2, Settings as SettingsIcon, LogOut, Plus, Check, X } from "lucide-react";
import { STAGES, PRIORITY_COLORS, STUCK_STAGE_DAYS } from "../lib/constants";
import { timeAgo, isOverdue, daysSince } from "../lib/helpers";

// Groups clients by company_id, preserving the sort order already applied to `filtered`
// (the first time a company is seen decides where its whole group sits in the list).
function groupByCompany(filtered, companiesById) {
  const groups = [];
  const byId = new Map();
  filtered.forEach((c) => {
    const key = c.companyId || c.id; // ungrouped fallback for rows with no company yet
    let group = byId.get(key);
    if (!group) {
      group = { companyId: key, companyName: companiesById[key]?.name || "", items: [] };
      byId.set(key, group);
      groups.push(group);
    }
    group.items.push(c);
  });
  return groups;
}

export default function Sidebar({
  filtered,
  companiesById = {},
  onAddDepartment,
  onRenameCompany,
  selectedId,
  onSelect,
  query,
  setQuery,
  stageFilter,
  setStageFilter,
  syncState,
  onExport,
  onImport,
  fileInputRef,
  onOpenTrash,
  onOpenSettings,
  onLogout,
  trashActive,
}) {
  const [editingCompany, setEditingCompany] = useState(null); // companyId being renamed
  const [editValue, setEditValue] = useState("");

  function startRename(companyId, currentName) {
    setEditingCompany(companyId);
    setEditValue(currentName);
  }
  function commitRename() {
    const name = editValue.trim();
    if (name && editingCompany) onRenameCompany(editingCompany, name);
    setEditingCompany(null);
  }

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-title">Workspace</div>
        <div className={"sync-state" + (syncState === "error" ? " error" : "")}>
          {syncState === "saving" ? "syncing…" : syncState === "synced" ? "synced" : syncState === "error" ? "sync failed" : ""}
        </div>
      </div>

      <div className="filter-chips">
        {["All", ...STAGES, "Churned"].map((s) => (
          <button key={s} className={"chip" + (stageFilter === s ? " active" : "")} onClick={() => setStageFilter(s)}>{s}</button>
        ))}
      </div>

      <div className="search-box">
        <Search size={14} color="var(--muted-2)" />
        <input placeholder="Search clients or specs" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="client-list">
        {filtered.length === 0 && <div className="empty-sidebar">No clients match. Adjust filters or add one.</div>}
        {groupByCompany(filtered, companiesById).map((group) => {
          const grouped = group.items.length > 1;
          const rows = group.items.map((c) => {
            const gtdDone = (c.gtd || []).filter((s) => s.done).length;
            const gtdTotal = (c.gtd || []).length;
            const dur = daysSince(c.stageEnteredAt);
            const stuck = dur !== null && dur > STUCK_STAGE_DAYS && !c.churned;
            return (
              <div
                key={c.id}
                className={"client-item" + (c.id === selectedId ? " active" : "") + (grouped ? " client-item-grouped" : "")}
                onClick={() => onSelect(c.id)}
              >
                <div className="client-item-name">
                  <span className="client-item-name-left">
                    <span className="priority-dot" style={{ background: PRIORITY_COLORS[c.priority || "Medium"] }} aria-label={(c.priority || "Medium") + " priority"} />
                    {grouped ? (c.departmentName || c.name || "Untitled department") : (c.name || "Untitled client")}
                  </span>
                  <span className="stage-pill" data-stage={c.churned ? "Churned" : c.stage}>
                    {c.churned ? "Churned" : c.stage}
                  </span>
                </div>
                {c.issues.filter((i) => !i.resolved).length > 0 && (
                  <div className="client-item-meta">
                    <span className="mono" style={{ fontSize: 11, color: "var(--red)" }}>{c.issues.filter((i) => !i.resolved).length} open</span>
                  </div>
                )}
                <div className="client-item-sub">
                  <span>{timeAgo(c.updatedAt)} · GTD {gtdDone}/{gtdTotal}</span>
                  {stuck && <span className="stuck-flag">stuck</span>}
                  {isOverdue(c.nextActionDate) && !c.churned && <span className="overdue-flag">overdue</span>}
                </div>
              </div>
            );
          });

          if (!grouped) {
            // Single department: render exactly as before, with a small "+" to split this
            // client into multiple departments the first time it's needed.
            const only = group.items[0];
            return (
              <div key={group.companyId} className="client-group client-group-single">
                {rows}
                <button
                  type="button"
                  className="client-add-dept client-add-dept-single"
                  onClick={(e) => { e.stopPropagation(); onAddDepartment(group.companyId, only.name); }}
                  title="Add another department or project for this client"
                >
                  <Plus size={11} /> Add department
                </button>
              </div>
            );
          }

          return (
            <div key={group.companyId} className="client-group">
              <div className="client-group-head">
                {editingCompany === group.companyId ? (
                  <span className="client-group-rename">
                    <input
                      className="input"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingCompany(null); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button type="button" className="icon-btn" onClick={commitRename} aria-label="Save name"><Check size={13} /></button>
                    <button type="button" className="icon-btn" onClick={() => setEditingCompany(null)} aria-label="Cancel"><X size={13} /></button>
                  </span>
                ) : (
                  <span className="client-group-name" onClick={() => startRename(group.companyId, group.companyName)} title="Click to rename company">
                    {group.companyName || "Untitled company"}
                  </span>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onAddDepartment(group.companyId, group.companyName)}
                  aria-label="Add another department"
                  title="Add another department or project"
                >
                  <Plus size={13} />
                </button>
              </div>
              {rows}
            </div>
          );
        })}
      </div>

      <footer className="sidebar-footer" aria-label="Workspace actions">
        <button className="btn btn-sm" onClick={onExport} aria-label="Download a full JSON backup of all clients"><Download size={13} /> Backup</button>
        <button className="btn btn-sm" onClick={() => fileInputRef.current.click()} aria-label="Restore clients from a JSON backup file"><Upload size={13} /> Restore</button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onImport} />
      </footer>
      <div className="sidebar-footer sidebar-footer-icons">
        <button className={"icon-btn" + (trashActive ? " active" : "")} aria-label="Trash" onClick={onOpenTrash}><Trash2 size={16} /></button>
        <button className="icon-btn" aria-label="Settings" onClick={onOpenSettings}><SettingsIcon size={16} /></button>
        <button className="icon-btn" aria-label="Sign out" onClick={onLogout}><LogOut size={16} /></button>
      </div>
    </div>
  );
}
