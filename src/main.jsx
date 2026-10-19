import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);

// Installable app shell — updates itself silently in the background on each
// visit; no "new version available" prompt needed for an internal tool.
registerSW({ immediate: true });
