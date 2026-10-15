export const STAGES = ["Lead", "Discovery", "POC", "Contract", "Deployed", "Live Support"];
export const SPEC_STATUSES = ["Draft", "Reviewed with Eng", "Approved", "In Progress", "Shipped"];
export const PRIORITIES = ["Low", "Medium", "High"];

export const STAGE_COLORS = {
  Lead: "#6366F1",
  Discovery: "#06B6D4",
  POC: "#0284C7",
  Contract: "#2563EB",
  Deployed: "#0D9488",
  "Live Support": "#059669",
  Churned: "#DC2626",
};
export const SPEC_COLORS = {
  Draft: "#8B8FA3",
  "Reviewed with Eng": "#7C6FE0",
  Approved: "#D69E2E",
  "In Progress": "#3E7C8C",
  Shipped: "#2F9E6E",
};
export const PRIORITY_COLORS = { Low: "#6B7280", Medium: "#D69E2E", High: "#D6544A" };
export const GATHERING_COLORS = { Pending: "#6B7280", Answered: "#2F9E6E" };

export const DEFAULT_GATHERING_QUESTIONS = [
  "What defects or anomalies need to be detected?",
  "What is being inspected — part/material, size, color, surface finish?",
  "What accuracy or tolerance is required for detection?",
  "What is the production line speed / cycle time?",
  "What are the environmental conditions (lighting, dust, vibration, temperature)?",
  "What mounting space is available for the camera and hardware?",
  "What is the existing infrastructure (network, power, PLC/SCADA integration)?",
  "What output is required (pass/fail signal, data logging, alerts, reporting)?",
  "What is the client's current inspection process (manual or automated)?",
  "Who are the key stakeholders and final decision makers?",
  "What is the expected timeline and budget range?",
];

export const DEFAULT_GTD_STEPS = [
  { id: "survey", label: "Site survey & requirements confirmed" },
  { id: "procurement", label: "Hardware procured (camera, lens, lighting, mounting)" },
  { id: "install", label: "On-site installation" },
  { id: "network", label: "Network & integration setup" },
  { id: "calibration", label: "Model calibration & testing" },
  { id: "uat", label: "UAT with client" },
  { id: "golive", label: "Go-live" },
  { id: "training", label: "Client training & handoff" },
  { id: "support", label: "Post-deployment support plan in place" },
];

export const WORK_DOMAIN = "biztel.ai";
export const STALE_DAYS = 14; // no contact in this many days = flagged stale on dashboard
export const STUCK_STAGE_DAYS = 30; // days in one stage before flagged as stuck

/* ---------- Product workspace (Inbox / Roadmap / Changelog / Hardware) ---------- */
export const FEATURE_STATUSES = ["Inbox", "Now", "Next", "Later", "Shipped"];
export const ROADMAP_COLUMNS = ["Now", "Next", "Later"];
export const FEATURE_STATUS_COLORS = {
  Inbox: "#8B8FA3",
  Now: "#D6544A",
  Next: "#D69E2E",
  Later: "#7C6FE0",
  Shipped: "#2F9E6E",
};

export const HARDWARE_STATUSES = ["In Stock", "To Be Procured", "Ordered", "Delivered"];
export const HARDWARE_STATUS_COLORS = {
  "In Stock": "#2F9E6E",
  "To Be Procured": "#D6544A",
  Ordered: "#7C6FE0",
  Delivered: "#D69E2E",
};
