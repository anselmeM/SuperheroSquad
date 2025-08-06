// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config"; // Base config
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, httpServer: Server) {

  // Define server options explicitly
  const serverOptions = {
    host: '0.0.0.0', // For the main server binding
    port: 5000,      // For the main server binding
    middlewareMode: true,
    hmr: {
      server: httpServer, // The http server instance
      host: '0.0.0.0',    // Explicitly bind HMR websocket server to all interfaces
      port: 5000,         // Internal HMR listener port
      clientPort: 443,    // External port client connects to (Replit HTTPS)
      protocol: 'wss',    // External protocol client uses (Replit HTTPS)
    },
  };

  const vite = await createViteServer({
    // Spread base config from vite.config.ts first
    ...viteConfig,
    // Ensure configFile is false so it doesn't reload and overwrite server options
    configFile: false,
    // Apply the explicit server/HMR options defined above
    server: serverOptions,
    // Override customLogger here if needed (or keep as is)
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // ... rest of the setupVite function remains the same ...
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      if (e instanceof Error) { // Type guard
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });
}

// ... (serveStatic function remains the same) ...
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public"); // Corrected path relative to server/vite.ts

  if (!fs.existsSync(distPath)) {
    // Adjusted path in error message
    throw new Error(
      `Could not find the build directory: ${path.resolve(__dirname, "..", "dist", "public")}, make sure to build the client first using 'npm run build'`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // Adjusted path for sending index.html
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}