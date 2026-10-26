import { STAGES, STAGE_COLORS } from "../lib/constants";

// Ambient motion behind the sign-in card: the pipeline stage-track sweeps in
// once as the page loads, while a faint, blurred glimpse of the dashboard
// (KPI tiles + a bar chart) keeps quietly pulsing underneath for as long as
// the screen is up. Pure CSS, no new dependencies — every color comes from
// the app's own theme tokens, so it holds up in both dark and light mode
// without any extra work here.
const SWEEP_STAGES = STAGES.slice(0, 5); // Lead..Deployed fills the strip without crowding it

export default function AuthMotionBackground() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <div className="auth-bg-dashboard">
        <div className="auth-bg-tiles">
          <div className="auth-bg-tile">
            <span className="auth-bg-tile-label">Clients</span>
            <span className="auth-bg-tile-bar" style={{ background: "var(--accent)" }} />
          </div>
          <div className="auth-bg-tile">
            <span className="auth-bg-tile-label">Active</span>
            <span className="auth-bg-tile-bar" style={{ background: "var(--green)" }} />
          </div>
          <div className="auth-bg-tile">
            <span className="auth-bg-tile-label">Issues</span>
            <span className="auth-bg-tile-bar" style={{ background: "var(--red)" }} />
          </div>
          <div className="auth-bg-tile">
            <span className="auth-bg-tile-label">Pending</span>
            <span className="auth-bg-tile-bar" style={{ background: "var(--amber)" }} />
          </div>
        </div>
        <div className="auth-bg-chart">
          {[62, 85, 48, 92, 70, 80].map((h, i) => (
            <div key={i} className="auth-bg-bar" style={{ height: h + "%", animationDelay: i * 0.3 + "s" }} />
          ))}
        </div>
      </div>

      <div className="auth-bg-track">
        {SWEEP_STAGES.map((stage, i) => (
          <div
            key={stage}
            className="auth-bg-seg"
            style={{ background: STAGE_COLORS[stage], animationDelay: 0.15 + i * 0.16 + "s" }}
          />
        ))}
        <div className="auth-bg-dot" />
      </div>
    </div>
  );
}
