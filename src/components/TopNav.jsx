import { useState } from "react";
import Logo from "./Logo";
import { LayoutGrid, Users, Map, Cpu, Plus, CalendarDays, Settings, Trash2, Download, Upload, LogOut, MoreHorizontal, X } from "lucide-react";
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
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <aside className="navrail navrail-wide">
        <div className="navrail-brand">
          <Logo size={24} />
          <span className="navrail-brand-name">CoreDesk</span>
        </div>
        {syncState === "error" ? (
          <div className="sync-state navrail-sync error">sync failed</div>
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

      {/* ---------- Mobile: bottom tab bar, replaces the side rail below the phone breakpoint ---------- */}
      <nav className="mobile-tabbar" aria-label="Main">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={"mobile-tab" + (activeTab === t.key ? " active" : "")}
              onClick={() => onNavigate(t.key)}
            >
              <Icon size={19} />
              <span>{t.label === "Hardware / BOM" ? "Hardware" : t.label}</span>
            </button>
          );
        })}
        <button className={"mobile-tab" + (moreOpen ? " active" : "")} onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>

      {/* ---------- Mobile: "More" sheet — everything else the side rail held ---------- */}
      {moreOpen && (
        <div className="mobile-sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-head">
              <div className="navrail-brand">
                <Logo size={22} />
                <span className="navrail-brand-name">CoreDesk</span>
              </div>
              <button className="icon-btn" aria-label="Close" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {syncState === "error" ? <div className="sync-state navrail-sync error">sync failed</div> : null}

            <button
              className="btn btn-sm btn-primary navrail-new-btn"
              onClick={() => { setMoreOpen(false); onNewClient(); }}
            >
              <Plus size={13} /> New client
            </button>

            <div className="mobile-sheet-row" onClick={() => { setMoreOpen(false); onOpenTrash(); }}>
              <Trash2 size={16} /> <span>Trash</span>
            </div>
            <div className="mobile-sheet-row" onClick={() => { setMoreOpen(false); onExport(); }}>
              <Download size={16} /> <span>Backup / Export</span>
            </div>
            <div className="mobile-sheet-row" onClick={() => { setMoreOpen(false); fileInputRef.current.click(); }}>
              <Upload size={16} /> <span>Restore / Import</span>
            </div>

            <button className="navrail-footer" style={{ marginTop: 10 }} onClick={() => { setMoreOpen(false); onOpenSettings(); }}>
              <span className="navrail-footer-avatar">{initials(userEmail)}</span>
              <span className="navrail-footer-email">{userEmail}</span>
              <Settings size={14} />
            </button>
            <div className="mobile-sheet-row" onClick={() => { setMoreOpen(false); onLogout(); }}>
              <LogOut size={16} /> <span>Sign out</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
