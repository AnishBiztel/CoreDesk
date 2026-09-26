import { Search, Download, Upload, Trash2, Settings as SettingsIcon, LogOut } from "lucide-react";
import { STAGES, PRIORITY_COLORS, STUCK_STAGE_DAYS } from "../lib/constants";
import { timeAgo, isOverdue, daysSince } from "../lib/helpers";

export default function Sidebar({
  filtered,
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
        {filtered.map((c) => {
          const gtdDone = (c.gtd || []).filter((s) => s.done).length;
          const gtdTotal = (c.gtd || []).length;
          const dur = daysSince(c.stageEnteredAt);
          const stuck = dur !== null && dur > STUCK_STAGE_DAYS && !c.churned;
          return (
            <div key={c.id} className={"client-item" + (c.id === selectedId ? " active" : "")} onClick={() => onSelect(c.id)}>
              <div className="client-item-name">
                <span className="client-item-name-left">
                  <span className="priority-dot" style={{ background: PRIORITY_COLORS[c.priority || "Medium"] }} aria-label={(c.priority || "Medium") + " priority"} />
                  {c.name || "Untitled client"}
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
