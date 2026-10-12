import { useFont } from "../lib/FontContext";

export default function FontToggle() {
  const { font, setFont } = useFont();

  return (
    <div className="font-toggle" role="radiogroup" aria-label="Font style">
      <button
        type="button"
        className={"font-toggle-opt" + (font === "default" ? " active" : "")}
        role="radio"
        aria-checked={font === "default"}
        onClick={() => setFont("default")}
      >
        Default
      </button>
      <button
        type="button"
        className={"font-toggle-opt" + (font === "system-bold" ? " active" : "")}
        role="radio"
        aria-checked={font === "system-bold"}
        onClick={() => setFont("system-bold")}
      >
        Bold
      </button>
    </div>
  );
}
