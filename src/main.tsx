import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerServiceWorker } from "./utils/pwa";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service Worker ma sens tylko na stronie WWW: w trybie deweloperskim cachowałby stare
// pliki, a w aplikacji Androida wszystko i tak jest lokalne.
if (import.meta.env.PROD && import.meta.env.VITE_ANDROID !== "true") {
  window.addEventListener("load", () => {
    void registerServiceWorker();
  });
}
