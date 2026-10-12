import { createContext, useContext, useEffect, useState } from "react";

const FontContext = createContext(null);
const STORAGE_KEY = "coredesk-font";

function getInitialFont() {
  if (typeof window === "undefined") return "default";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "system-bold" || saved === "default") return saved;
  return "default";
}

export function FontProvider({ children }) {
  const [font, setFontState] = useState(getInitialFont);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
    try {
      window.localStorage.setItem(STORAGE_KEY, font);
    } catch (e) {
      // localStorage can throw in some locked-down browser contexts — the font
      // choice still applies for the current session, it just won't persist.
    }
  }, [font]);

  function setFont(next) {
    setFontState(next === "system-bold" ? "system-bold" : "default");
  }

  return <FontContext.Provider value={{ font, setFont }}>{children}</FontContext.Provider>;
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within a FontProvider");
  return ctx;
}
