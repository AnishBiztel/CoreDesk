import { STALE_DAYS, STUCK_STAGE_DAYS } from "./constants";
import { daysSince, isOverdue } from "./helpers";

// Combines signals already tracked on the client (overdue next action, days
// since last contact, open issues, time stuck in the current stage) into one
// 0-100 score and a band, so the sidebar/table can show a single glance-able
// health indicator instead of four separate things to notice.
export function computeHealthScore(client) {
  if (!client) return { score: null, band: "unknown", label: "—", reasons: [] };
  if (client.churned) return { score: null, band: "churned", label: "Churned", reasons: [] };

  let score = 100;
  const reasons = [];

  if (client.nextActionDate && isOverdue(client.nextActionDate)) {
    score -= 30;
    reasons.push("Next action is overdue");
  }

  const sinceContact = client.lastContact ? daysSince(client.lastContact) : null;
  if (sinceContact !== null) {
    if (sinceContact > STALE_DAYS * 2) {
      score -= 20;
      reasons.push(`No contact in ${sinceContact} days`);
    } else if (sinceContact > STALE_DAYS) {
      score -= 8;
      reasons.push(`No contact in ${sinceContact} days`);
    }
  }

  const openIssues = (client.issues || []).filter((i) => !i.resolved).length;
  if (openIssues > 0) {
    score -= Math.min(openIssues * 8, 24);
    reasons.push(`${openIssues} open issue${openIssues > 1 ? "s" : ""}`);
  }

  const inStage = client.stageEnteredAt ? daysSince(client.stageEnteredAt) : null;
  if (inStage !== null) {
    if (inStage > STUCK_STAGE_DAYS) {
      score -= 20;
      reasons.push(`Stuck in ${client.stage} for ${inStage} days`);
    } else if (inStage > STUCK_STAGE_DAYS / 2) {
      score -= 8;
      reasons.push(`${inStage} days in ${client.stage}`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  let band = "healthy";
  let label = "Healthy";
  if (score < 40) {
    band = "critical";
    label = "At risk";
  } else if (score < 70) {
    band = "watch";
    label = "Watch";
  }

  return { score, band, label, reasons };
}

export const HEALTH_BAND_COLORS = {
  healthy: "#2F9E6E",
  watch: "#D69E2E",
  critical: "#D6544A",
  churned: "#8B8FA3",
  unknown: "#8B8FA3",
};
