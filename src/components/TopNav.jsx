import Logo from "./Logo";
import { LayoutGrid, Users, Map, Cpu, Plus, CalendarDays, Settings, Trash2, Download, Upload, LogOut } from "lucide-react";
import { initials } from "../lib/helpers";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "clients", label: "Clients", icon: Users },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "hardware", label: "Hardware / BOM", icon: Cpu },
];

export default function TopNav({
  activeTab,
  onNavigate,
  userEmail,
  onOpenSettings,
  onNewClient,
  syncState,
  onExport,
  onImport,
  fileInputRef,
  onOpenTrash,
  trashActive,
  onLogout,
}) {
  return (
    <aside className="navrail navrail-wide">
      <div className="navrail-brand">
        <Logo size={24} />
        <span className="navrail-brand-name">CoreDesk</span>
      </div>
      {syncState ? (
        <div className={"sync-state navrail-sync" + (syncState === "error" ? " error" : "")}>
          {syncState === "saving" ? "syncing…" : syncState === "synced" ? "synced" : syncState === "error" ? "sync failed" : ""}
        </div>
      ) : null}

      <button className="btn btn-sm btn-primary navrail-new-btn" onClick={onNewClient}>
        <Plus size={13} /> New
      </button>

      <nav className="navrail-items" aria-label="Main">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={"navrail-item" + (activeTab === t.key ? " active" : "")}
              onClick={() => onNavigate(t.key)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="navrail-spacer" />

      <div className="navrail-utility" aria-label="Workspace actions">
        <button className={"icon-btn" + (trashActive ? " active" : "")} aria-label="Trash" onClick={onOpenTrash}>
          <Trash2 size={15} />
        </button>
        <button className="icon-btn" aria-label="Backup" onClick={onExport}>
          <Download size={15} />
        </button>
        <button className="icon-btn" aria-label="Restore" onClick={() => fileInputRef.current.click()}>
          <Upload size={15} />
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onImport} />
        <button className="icon-btn" aria-label="Sign out" onClick={onLogout}>
          <LogOut size={15} />
        </button>
      </div>

      <button className="navrail-footer" onClick={onOpenSettings}>
        <span className="navrail-footer-avatar">{initials(userEmail)}</span>
        <span className="navrail-footer-email">{userEmail}</span>
        <Settings size={14} />
      </button>
    </aside>
  );
}
