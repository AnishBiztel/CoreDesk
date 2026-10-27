import { useMemo } from "react";
import { STAGES, STAGE_COLORS } from "../lib/constants";

export default function RightRail({ allClients }) {
  const stats = useMemo(() => {
    const active = allClients.filter((c) => !c.churned);
    const openIssues = active.reduce((sum, c) => sum + c.issues.filter((i) => !i.resolved).length, 0);
    const pendingTasks = allClients.reduce(
      (sum, c) => sum + c.specs.filter((s) => s.status === "Draft" || s.status === "Reviewed with Eng").length,
      0
    );
    const pastLead = active.filter((c) => c.stage !== "Lead").length;
    const velocity = active.length ? Math.round((pastLead / active.length) * 100) : 0;
    return { activeCount: active.length, openIssues, pendingTasks, velocity };
  }, [allClients]);

  const distribution = useMemo(() => {
    const active = allClients.filter((c) => !c.churned);
    const byStage = STAGES.map((stage) => ({
      stage,
      count: active.filter((c) => c.stage === stage).length,
    })).filter((d) => d.count > 0);
    const churnedCount = allClients.filter((c) => c.churned).length;
    if (churnedCount > 0) byStage.push({ stage: "Churned", count: churnedCount });
    return byStage;
  }, [allClients]);

  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <aside className="right-rail">
      <div className="right-rail-section">
        <div className="right-rail-title">Dashboard insights</div>
        <div className="rail-kpi-grid">
          <div className="rail-kpi rail-kpi-neutral"><div className="rail-kpi-num">{stats.activeCount}</div><div className="rail-kpi-label">Active clients</div></div>
          <div className={"rail-kpi" + (stats.openIssues ? " rail-kpi-red" : " rail-kpi-neutral")}><div className="rail-kpi-num" style={{ color: stats.openIssues ? "var(--red)" : "var(--ink)" }}>{stats.openIssues}</div><div className="rail-kpi-label">Open issue{stats.openIssues === 1 ? "" : "s"}</div></div>
          <div className={"rail-kpi" + (stats.pendingTasks ? " rail-kpi-amber" : " rail-kpi-neutral")}><div className="rail-kpi-num" style={{ color: stats.pendingTasks ? "var(--amber)" : "var(--ink)" }}>{stats.pendingTasks}</div><div className="rail-kpi-label">Pending tasks</div></div>
          <div className="rail-kpi rail-kpi-accent"><div className="rail-kpi-num">{stats.velocity}%</div><div className="rail-kpi-label">Pipeline velocity</div></div>
        </div>
      </div>

      <div className="right-rail-section">
        <div className="right-rail-title">Project status distribution</div>
        {distribution.length === 0 && <div className="no-items" style={{ padding: "8px 0" }}>No active clients yet.</div>}
        {distribution.map((d) => (
          <div className="rail-dist-row" key={d.stage}>
            <span className="rail-dist-dot" style={{ background: STAGE_COLORS[d.stage] }} />
            <span className="rail-dist-label">{d.stage}</span>
            <div className="rail-dist-bar"><div className="rail-dist-bar-fill" style={{ width: (d.count / maxCount) * 100 + "%", background: STAGE_COLORS[d.stage] }} /></div>
            <span className="rail-dist-count">{d.count}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
