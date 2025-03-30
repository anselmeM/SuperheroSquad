import { createRoot } from "react-dom/client";
// Import the HMR fix first to ensure it runs before any WebSocket connections are made
import './utils/hmr-fix';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
