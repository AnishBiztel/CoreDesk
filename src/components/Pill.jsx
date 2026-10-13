// Flat, solid status pill — no border, no glow, no gradient. `tone="danger"`
// is the one high-contrast red used for "Churned"; everything else is the
// neutral tone so metadata never competes visually with real alerts.
export default function Pill({ tone = "neutral", children }) {
  return <span className={"dp-pill" + (tone === "danger" ? " dp-pill-danger" : "")}>{children}</span>;
}
