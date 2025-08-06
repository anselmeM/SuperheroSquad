import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
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

// Renamed 'server' parameter to 'httpServer' for clarity
export async function setupVite(app: Express, httpServer: Server) {
  // Define server options explicitly
  const serverOptions = {
    host: '0.0.0.0', // Necessary for Replit to bind correctly
    port: 5000,      // The internal port your Express server runs on
    middlewareMode: true,
    hmr: {
      server: httpServer, // Pass the HTTP server instance
      host: '0.0.0.0',    // Explicitly bind HMR websocket server to all interfaces
      port: 5000,         // The port the HMR WebSocket server listens on internally
      // Explicitly tell the client which port to connect to
      // Replit typically proxies HTTPS/WSS traffic on port 443
      clientPort: 443,
      // Explicitly set the protocol for the client (Replit uses wss)
      protocol: 'wss',
      // You could optionally try setting the host if needed, but the proxy usually handles this
      // host: 'localhost',
    },
 
    // allowedHosts: true, // Often not needed when middlewareMode is true and handled by proxy
  };
  const vite = await createViteServer({
    // Spread base config from vite.config.ts first
    ...viteConfig,
    // Ensure configFile is false so it doesn't reload and overwrite server options
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    // Pass the explicit server options
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
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