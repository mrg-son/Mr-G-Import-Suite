import { createRoot } from "react-dom/client";
import { initStorage } from "./lib/storage";
import App from "./App.tsx";
import "./index.css";

// Initialize IndexedDB storage (migration + cache hydration) then render
initStorage().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
