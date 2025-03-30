// Import HMR fix before anything else to ensure WebSocket connections work correctly
import './utils/hmr-fix';

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
