import { useState, useEffect } from "react";
import Logo from "./Logo";
import { LayoutGrid, Users, Map, Cpu, Plus, CalendarDays } from "lucide-react";
import { initials } from "../lib/helpers";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "clients", label: "Clients", icon: Users },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "hardware", label: "Hardware / BOM", icon: Cpu },
];

function formatNow(d) {
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${time} ${day}-${month}-${year}`;
}

export default function TopNav({ activeTab, onNavigate, userEmail, onOpenSettings, onNewClient }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topnav">
      <div className="topnav-brand">
        <Logo size={26} />
        <span className="topnav-brand-name">CoreDesk</span>
      </div>

      <nav className="topnav-tabs" aria-label="Main">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={"topnav-tab" + (activeTab === t.key ? " active" : "")}
              onClick={() => onNavigate(t.key)}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </nav>

      <div className="topnav-utility">
        <button className="btn btn-sm btn-primary" onClick={onNewClient}><Plus size={13} /> New</button>
        <span className="topnav-clock">{formatNow(now)}</span>
        <button className="topnav-avatar" aria-label={userEmail} onClick={onOpenSettings}>{initials(userEmail)}</button>
      </div>
    </header>
  );
}
