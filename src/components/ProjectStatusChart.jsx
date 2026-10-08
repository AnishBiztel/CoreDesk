import { useMemo } from "react";
import { STAGES, STAGE_COLORS } from "../lib/constants";

// A monochrome blue scale for this chart specifically, matching the Salesforce-style
// reference — distinct from STAGE_COLORS (used for badges/pills elsewhere), which keep
// their more distinguishable per-stage hues since those serve a wayfinding purpose.
const CHART_BLUE_SCALE = {
  Lead: "#0A3D7A",
  Discovery: "#7CC4FF",
  POC: "#4FABFF",
  Contract: "#1B6FE0",
  Deployed: "#8A99AC",
  "Live Support": "#0176D3",
};

export default function ProjectStatusChart({ clients = [] }) {
  const statusData = useMemo(() => {
    const active = clients.filter((client) => !client.churned);
    const counts = STAGES.map((stage) => ({
      stage,
      count: active.filter((client) => client.stage === stage).length,
      color: CHART_BLUE_SCALE[stage] || STAGE_COLORS[stage],
    }));
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    const churned = clients.filter((client) => client.churned).length;
    return { counts, total, churned };
  }, [clients]);

  let offset = 0;
  const segments = statusData.counts.map((item) => {
    const start = statusData.total ? (offset / statusData.total) * 100 : 0;
    offset += item.count;
    const end = statusData.total ? (offset / statusData.total) * 100 : 0;
    return `${item.color} ${start}% ${end}%`;
  });

  const background = statusData.total
    ? `conic-gradient(${segments.join(", ")})`
    : "conic-gradient(#252a34 0 100%)";

  return (
    <section className="project-status-card" aria-label="Project status overview">
      <div className="project-status-head">
        <div>
          <h2>Project Status</h2>
        </div>
        <div className="project-status-head-meta">
          <div className="project-status-live"><span /> Live</div>
          {statusData.churned > 0 && (
            <div className="project-status-churned-badge">
              <span className="project-status-dot" style={{ background: STAGE_COLORS.Churned }} /> {statusData.churned} churned
            </div>
          )}
        </div>
      </div>

      <div className="project-status-body">
        <div className="project-status-donut-wrap">
          <div className="project-status-donut" style={{ background }} aria-label={`${statusData.total} active projects`}>
            <div className="project-status-donut-inner">
              <strong>{statusData.total}</strong>
              <span>Active projects</span>
            </div>
          </div>
        </div>

        <div className="project-status-list">
          {statusData.counts.map((item) => {
            const percentage = statusData.total ? Math.round((item.count / statusData.total) * 100) : 0;
            return (
              <div className="project-status-row" key={item.stage}>
                <span className="project-status-row-label">
                  <span className="project-status-dot" style={{ background: item.color }} />
                  {item.stage}
                </span>
                <span className="project-status-row-bar">
                  <span style={{ width: `${percentage}%`, background: item.color }} />
                </span>
                <span className="project-status-count">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
