import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker with update prompt
const updateSW = registerSW({
  onNeedRefresh() {
    toast("Nouvelle version disponible", {
      duration: Infinity,
      action: {
        label: "Mettre à jour",
        onClick: () => updateSW(true),
      },
    });
  },
  onOfflineReady() {
    toast.success("App disponible hors-ligne");
  },
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
