import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ZodError } from "zod";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  /**
   * Enhanced global error handler
   * 
   * Features:
   * - Structured logging with JSON format
   * - Error categorization (expected vs unexpected)
   * - Stack trace capture
   * - Request path logging
   * - Support for specific error types (API errors, validation errors)
   */
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Check if response was already sent
    if (res.headersSent) {
      return _next(err);
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const path = req.path;
    
    // Determine if this is an expected error (client error) or unexpected (server error)
    const isExpectedError = status < 500;
    
    // Create structured error log
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: isExpectedError ? "warn" : "error",
      status,
      message,
      path,
      method: req.method,
      // Only include stack trace for unexpected errors
      ...(isExpectedError ? {} : { stack: err.stack }),
      // Special handling for specific error types
      errorType: err.name || (err instanceof ZodError ? "ValidationError" : "UnknownError"),
      // Add API-specific error info if available
      ...(err.response ? { apiError: err.response } : {}),
    };

    // Log the structured error
    if (isExpectedError) {
      // Expected errors (4xx) - less verbose logging
      console.warn(`API Error: ${JSON.stringify(errorLog)}`);
    } else {
      // Unexpected errors (5xx) - full error logging
      console.error(`Server Error: ${JSON.stringify(errorLog)}`);
    }

    // Send appropriate response to client
    res.status(status).json({ 
      status: isExpectedError ? "error" : "failure",
      message,
      code: status,
      // Include additional context for API errors
      ...(err.response && err.response.error ? { details: err.response.error } : {})
    });
    
    // Important: We don't re-throw the error, as that would crash the server
    // The error has been logged and a response has been sent to the client
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
