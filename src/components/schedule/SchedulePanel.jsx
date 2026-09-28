import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchEvents, insertEvent, updateEvent, deleteEvent, emptyEvent, isMissingTable } from "../../lib/scheduleApi";
import { fetchReleases } from "../../lib/productApi";
import {
  toISODate, parseISODate, addDays, isSameDay, startOfWeek, monthGridDays,
  timeToMinutes, minutesToTime, formatTime, formatHourLabel, rangeLabel, WEEKDAYS_SHORT,
} from "../../lib/dates";
import { refreshWhenIdle } from "../../lib/editGuard";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";
import { SkeletonBlock, SkeletonLine } from "../Skeleton";
import ScheduleEventModal from "./ScheduleEventModal";

const HOUR_H = 48;
const MAX_CHIPS = 3;
const STAGE_LEGEND = ["Lead", "Discovery", "POC", "Contract", "Deployed", "Live Support", "Churned", "General"];
const PRIORITY_LEGEND = ["High", "Medium", "Low"];

/* ---------- helpers ---------- */

function buildItems({ events, clients, releases, showClientActions, showReleases, clientFilter }) {
  const items = events.map((e) => ({
    id: e.id,
    source: "custom",
    raw: e,
    title: e.title || "Untitled",
    type: e.event_type,
    date: String(e.start_date).slice(0, 10),
    endDate: String(e.end_date || e.start_date).slice(0, 10),
    startTime: e.start_time || null,
    endTime: e.end_time || null,
    clientId: e.client_id || null,
    priority: e.priority || "Medium",
    done: !!e.done,
  }));

  if (showClientActions) {
    clients.forEach((c) => {
      if (!c.nextActionDate || c.churned) return;
      const d = String(c.nextActionDate).slice(0, 10);
      items.push({
        id: "client-" + c.id, source: "client", title: c.nextAction || "Next action", type: "Follow-up",
        date: d, endDate: d, startTime: null, endTime: null, clientId: c.id, priority: c.priority || "Medium", done: false,
      });
    });
  }

  if (showReleases && clientFilter === "all") {
    releases.forEach((r) => {
      const d = String(r.release_date).slice(0, 10);
      items.push({
        id: "release-" + r.id, source: "release", title: "Release " + r.version, type: "Milestone",
        date: d, endDate: d, startTime: null, endTime: null, clientId: null, priority: "Medium", done: false,
      });
    });
  }

  return clientFilter === "all" ? items : items.filter((i) => i.clientId === clientFilter);
}

function groupByDate(items) {
  const map = {};
  items.forEach((it) => {
    let d = parseISODate(it.date);
    const end = parseISODate(it.endDate < it.date ? it.date : it.endDate);
    for (let n = 0; n < 62 && d <= end; n++) {
      const key = toISODate(d);
      (map[key] = map[key] || []).push(it);
      d = addDays(d, 1);
    }
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => {
      if (!!a.startTime !== !!b.startTime) return a.startTime ? 1 : -1;
      return (a.startTime || "").localeCompare(b.startTime || "") || a.title.localeCompare(b.title);
    })
  );
  return map;
}

const isTimedSingleDay = (it) => !!it.startTime && it.endDate === it.date;

function layoutDay(list) {
  const evs = list.map((it) => {
    const start = timeToMinutes(it.startTime);
    let end = it.endTime ? timeToMinutes(it.endTime) : start + 60;
    if (end <= start) end = start + 30;
    return { it, start, end: Math.min(end, 24 * 60), lane: 0, lanes: 1 };
  });
  evs.sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach((e) => {
      let l = lanes.findIndex((end) => end <= e.start);
      if (l === -1) { l = lanes.length; lanes.push(e.end); } else lanes[l] = e.end;
      e.lane = l;
    });
    cluster.forEach((e) => { e.lanes = lanes.length; });
    out.push(...cluster);
    cluster = [];
  };
  evs.forEach((e) => {
    if (cluster.length && e.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  });
  if (cluster.length) flush();
  return out;
}

/* ---------- component ---------- */

export default function SchedulePanel({ clients, session, onOpenClient }) {
  const toast = useToast();
  const confirm = useConfirm();
  const userId = session?.user?.id;

  const [view, setView] = useState(() => {
    try { return localStorage.getItem("coredesk-schedule-view") || "month"; } catch { return "month"; }
  });
  const [anchor, setAnchor] = useState(() => new Date());
  const [colorBy, setColorBy] = useState("stage");
  const [clientFilter, setClientFilter] = useState("all");
  const [showClientActions, setShowClientActions] = useState(true);
  const [showReleases, setShowReleases] = useState(true);
  const [events, setEvents] = useState(null);
  const [releases, setReleases] = useState([]);
  const [storageMissing, setStorageMissing] = useState(false);
  const [modal, setModal] = useState(null); // { isNew, initial }
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef(null);

  const clientsById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  async function loadAll() {
    try {
      setEvents(await fetchEvents());
      setStorageMissing(false);
    } catch (e) {
      if (isMissingTable(e)) setStorageMissing(true);
      else console.warn("schedule load failed", e);
      setEvents((prev) => prev ?? []);
    }
    try {
      setReleases(await fetchReleases());
    } catch {
      /* releases are optional context */
    }
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("schedule-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_events" }, () => refreshWhenIdle(loadAll))
      .on("postgres_changes", { event: "*", schema: "public", table: "releases" }, () => refreshWhenIdle(loadAll))
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function changeView(v) {
    setView(v);
    try { localStorage.setItem("coredesk-schedule-view", v); } catch { /* ignore */ }
  }

  const items = useMemo(
    () => buildItems({ events: events || [], clients, releases, showClientActions, showReleases, clientFilter }),
    [events, clients, releases, showClientActions, showReleases, clientFilter]
  );
  const byDate = useMemo(() => groupByDate(items), [items]);

  const timeDays = useMemo(
    () => (view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)) : [anchor]),
    [view, anchor]
  );

  // Open the time grid scrolled to the working day.
  useEffect(() => {
    if (view === "month" || !scrollRef.current) return;
    const hour = timeDays.some((d) => isSameDay(d, new Date())) ? Math.max(0, new Date().getHours() - 1) : 8;
    scrollRef.current.scrollTop = Math.max(0, hour * HOUR_H - 10);
  }, [view, events === null]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- navigation ----- */
  function shift(dir) {
    if (view === "month") setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
    else setAnchor((a) => addDays(a, dir * (view === "week" ? 7 : 1)));
  }
  function goDay(d) {
    setAnchor(d);
    changeView("day");
  }

  /* ----- colors ----- */
  function toneOf(it) {
    if (it.source === "release") return "Release";
    if (colorBy === "priority") return "prio-" + (it.priority || "Medium");
    const c = it.clientId ? clientsById[it.clientId] : null;
    if (!c) return "General";
    return c.churned ? "Churned" : c.stage;
  }

  function tooltipOf(it) {
    const c = it.clientId ? clientsById[it.clientId] : null;
    const bits = [it.title, it.type];
    if (c) bits.push(c.name || "Untitled client");
    if (it.startTime) bits.push(formatTime(it.startTime) + (it.endTime ? "–" + formatTime(it.endTime) : ""));
    if (it.source === "client") bits.push("Client next action");
    return bits.join(" · ");
  }

  /* ----- create / edit / delete ----- */
  function openNew(dateStr, startTime) {
    const initial = emptyEvent(dateStr);
    if (startTime) {
      initial.start_time = startTime;
      initial.end_time = minutesToTime(timeToMinutes(startTime) + 60);
    }
    if (clientFilter !== "all") {
      initial.client_id = clientFilter;
      initial.priority = clientsById[clientFilter]?.priority || "Medium";
    }
    setModal({ isNew: true, initial });
  }

  function openItem(it) {
    if (it.source === "client") return onOpenClient(it.clientId);
    if (it.source === "custom") setModal({ isNew: false, initial: it.raw });
  }

  async function persistNew(ev) {
    setEvents((es) => [...(es || []), ev]);
    try {
      await insertEvent(ev, userId);
    } catch (e) {
      setEvents((es) => es.filter((x) => x.id !== ev.id));
      if (isMissingTable(e)) setStorageMissing(true);
      toast.error("Couldn't save item", isMissingTable(e) ? "Run supabase-schedule.sql first." : e.message);
    }
  }

  async function persistPatch(ev) {
    const previous = events.find((x) => x.id === ev.id);
    setEvents((es) => es.map((x) => (x.id === ev.id ? { ...x, ...ev } : x)));
    try {
      await updateEvent(ev.id, ev);
    } catch (e) {
      setEvents((es) => es.map((x) => (x.id === ev.id ? previous : x)));
      toast.error("Couldn't save changes", e.message);
    }
  }

  async function handleSave(ev) {
    const isNew = modal.isNew;
    setModal(null);
    if (isNew) await persistNew(ev);
    else await persistPatch(ev);
  }

  async function handleDelete(ev) {
    const ok = await confirm(`Delete "${ev.title}" from the calendar? This can't be undone.`, { title: "Delete item", confirmLabel: "Delete" });
    if (!ok) return;
    setModal(null);
    const previous = events.find((x) => x.id === ev.id);
    setEvents((es) => es.filter((x) => x.id !== ev.id));
    try {
      await deleteEvent(ev.id);
    } catch (e) {
      setEvents((es) => [...es, previous]);
      toast.error("Couldn't delete", e.message);
    }
  }

  /* ----- drag a chip to another day (month view) ----- */
  function onChipDragStart(e, it, cellDate) {
    e.dataTransfer.setData("text/plain", it.id + "|" + cellDate);
    e.dataTransfer.effectAllowed = "move";
  }
  function onCellDrop(e, dropDate) {
    e.preventDefault();
    const [id, fromDate] = e.dataTransfer.getData("text/plain").split("|");
    const ev = (events || []).find((x) => x.id === id);
    if (!ev || !fromDate || fromDate === dropDate) return;
    const delta = Math.round((parseISODate(dropDate) - parseISODate(fromDate)) / 86400000);
    const start = toISODate(addDays(parseISODate(ev.start_date), delta));
    const end = ev.end_date ? toISODate(addDays(parseISODate(ev.end_date), delta)) : null;
    persistPatch({ ...ev, start_date: start, end_date: end });
  }

  /* ----- pieces ----- */
  function renderChip(it, cellDate) {
    const draggable = it.source === "custom";
    return (
      <button
        type="button"
        key={it.id + cellDate}
        className={"cal-ev cal-chip" + (it.done ? " done" : "")}
        data-tone={toneOf(it)}
        title={tooltipOf(it)}
        draggable={draggable}
        onDragStart={draggable ? (e) => onChipDragStart(e, it, cellDate) : undefined}
        onClick={(e) => { e.stopPropagation(); openItem(it); }}
      >
        {it.startTime && <span className="cal-chip-time">{formatTime(it.startTime)}</span>}
        <span className="cal-chip-title">{it.title}</span>
      </button>
    );
  }

  const todayStr = toISODate(new Date());
  const legendTones = colorBy === "stage" ? STAGE_LEGEND : PRIORITY_LEGEND.map((p) => "prio-" + p);
  const sortedClients = [...clients].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  /* ----- month view ----- */
  function renderMonth() {
    const days = monthGridDays(anchor);
    const weeks = days.length / 7;
    return (
      <div className="cal-month">
        <div className="cal-weekdays">
          {WEEKDAYS_SHORT.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="cal-month-grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(112px, 1fr))` }}>
          {days.map((d) => {
            const key = toISODate(d);
            const list = byDate[key] || [];
            const visible = list.slice(0, MAX_CHIPS);
            return (
              <div
                key={key}
                className={"cal-cell" + (d.getMonth() !== anchor.getMonth() ? " other" : "") + (key === todayStr ? " today" : "")}
                onClick={() => openNew(key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onCellDrop(e, key)}
              >
                <button type="button" className="cal-daynum" onClick={(e) => { e.stopPropagation(); goDay(d); }} aria-label={"Open " + key}>
                  {d.getDate()}
                </button>
                {visible.map((it) => renderChip(it, key))}
                {list.length > MAX_CHIPS && (
                  <button type="button" className="cal-more" onClick={(e) => { e.stopPropagation(); goDay(d); }}>
                    +{list.length - MAX_CHIPS} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ----- week / day view ----- */
  function renderTimeGrid() {
    const cols = timeDays.length;
    const gridCols = `56px repeat(${cols}, minmax(0, 1fr))`;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return (
      <div className="cal-time">
        <div className="cal-time-head" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {timeDays.map((d) => {
            const key = toISODate(d);
            return (
              <button type="button" key={key} className={"cal-time-day" + (key === todayStr ? " today" : "")} onClick={() => goDay(d)}>
                <span className="cal-time-wd">{WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}</span>
                <span className="cal-time-dn">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="cal-allday" style={{ gridTemplateColumns: gridCols }}>
          <div className="cal-allday-label">All day</div>
          {timeDays.map((d) => {
            const key = toISODate(d);
            const allDay = (byDate[key] || []).filter((it) => !isTimedSingleDay(it));
            return (
              <div key={key} className="cal-allday-cell" onClick={() => openNew(key)}>
                {allDay.map((it) => renderChip(it, key))}
              </div>
            );
          })}
        </div>

        <div className="cal-time-scroll" ref={scrollRef}>
          <div className="cal-time-body" style={{ gridTemplateColumns: gridCols, height: HOUR_H * 24 }}>
            <div className="cal-hours">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="cal-hour-label" style={{ height: HOUR_H }}>{h === 0 ? "" : formatHourLabel(h)}</div>
              ))}
            </div>
            {timeDays.map((d) => {
              const key = toISODate(d);
              const timed = layoutDay((byDate[key] || []).filter(isTimedSingleDay));
              return (
                <div
                  key={key}
                  className={"cal-daycol" + (key === todayStr ? " today" : "")}
                  style={{ backgroundSize: `100% ${HOUR_H}px` }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    openNew(key, minutesToTime(Math.floor((e.nativeEvent.offsetY / HOUR_H) * 2) * 30));
                  }}
                >
                  {timed.map(({ it, start, end, lane, lanes }) => {
                    const c = it.clientId ? clientsById[it.clientId] : null;
                    return (
                      <button
                        type="button"
                        key={it.id}
                        className={"cal-ev cal-block" + (it.done ? " done" : "")}
                        data-tone={toneOf(it)}
                        title={tooltipOf(it)}
                        style={{
                          top: (start / 60) * HOUR_H,
                          height: Math.max(22, ((end - start) / 60) * HOUR_H - 2),
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                        onClick={(e) => { e.stopPropagation(); openItem(it); }}
                      >
                        <span className="cal-block-title">{it.title}</span>
                        <span className="cal-block-meta">
                          {formatTime(it.startTime)}{it.endTime ? "–" + formatTime(it.endTime) : ""}{c ? " · " + (c.name || "Untitled client") : ""}
                        </span>
                      </button>
                    );
                  })}
                  {key === todayStr && <div className="cal-now" style={{ top: (nowMin / 60) * HOUR_H }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (events === null) {
    return (
      <div className="main-inner">
        <SkeletonLine width={200} height={16} style={{ marginBottom: 22 }} />
        <SkeletonBlock height={44} style={{ marginBottom: 14 }} />
        <SkeletonBlock height={420} />
      </div>
    );
  }

  return (
    <div className="main-inner cal-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>Home</span> <span className="breadcrumb-sep">/</span> <span className="breadcrumb-current">Schedule</span>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Schedule</h1>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openNew(toISODate(view === "month" ? new Date() : anchor))}>
            <Plus size={13} /> Schedule item
          </button>
        </div>
      </div>

      {storageMissing && (
        <div className="cal-banner" role="status">
          Calendar storage isn't set up yet, so new items can't be saved. Run <code>supabase-schedule.sql</code> in the Supabase SQL editor
          (click Backup first), then refresh. Client next actions and releases still show.
        </div>
      )}

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="btn btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next"><ChevronRight size={16} /></button>
          <h2 className="cal-range">{rangeLabel(view, anchor)}</h2>
        </div>
        <div className="cal-seg" role="tablist" aria-label="Calendar view">
          {["month", "week", "day"].map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={"cal-seg-btn" + (view === v ? " active" : "")} onClick={() => changeView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="cal-filters">
        <label className="cal-filter">
          <span>Color by</span>
          <select className="input" value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
            <option value="stage">Client stage</option>
            <option value="priority">Priority</option>
          </select>
        </label>
        <label className="cal-filter">
          <span>Client</span>
          <select className="input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">All clients</option>
            {sortedClients.map((c) => <option key={c.id} value={c.id}>{c.name || "Untitled client"}</option>)}
          </select>
        </label>
        <label className="cal-check">
          <input type="checkbox" checked={showClientActions} onChange={(e) => setShowClientActions(e.target.checked)} />
          Client next actions
        </label>
        <label className="cal-check">
          <input type="checkbox" checked={showReleases} onChange={(e) => setShowReleases(e.target.checked)} />
          Releases
        </label>
      </div>

      <div className="cal-legend" aria-label="Color key">
        {legendTones.map((t) => (
          <span key={t} className="cal-legend-item">
            <span className="cal-swatch" data-tone={t} /> {t.replace("prio-", "")}
          </span>
        ))}
        {showReleases && (
          <span className="cal-legend-item"><span className="cal-swatch" data-tone="Release" /> Release</span>
        )}
      </div>

      <div className="card cal-card">{view === "month" ? renderMonth() : renderTimeGrid()}</div>

      {modal && (
        <ScheduleEventModal
          key={modal.initial.id}
          initial={modal.initial}
          isNew={modal.isNew}
          clients={clients}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
