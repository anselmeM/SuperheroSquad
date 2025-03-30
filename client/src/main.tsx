import { createRoot } from "react-dom/client";
// Import the HMR fix and interceptor first (order matters) to ensure they run
// before any WebSocket connections are made by Vite
import './utils/vite-hmr-interceptor';
// Remove the older fix since the interceptor is more comprehensive
// import './utils/hmr-fix';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
