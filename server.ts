import "dotenv/config";
import express, { Express } from "express";
import http from "http";
import path from "path";
import { serverConfig, redactConfig } from "./server/config";
import { db } from "./server/db";
import { logger } from "./server/logger";
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
  securityHeaders,
  corsMiddleware,
  apiRateLimiter,
  compressionMiddleware,
} from "./server/middleware";
import { errorHandlerMiddleware, notFoundHandler } from "./server/middleware/error.middleware";
import apiRouter from "./server/routes";

/**
 * Creates and configures the Express application instance
 */
export function createExpressApp(): Express {
  const app = express();

  // Initialize persistent cloud or in-memory database
  db.initialize().catch(err => {
    logger.warn("[RiskLens AI] Database initialization deferred:", { error: err?.message });
  });

  // 1. Security & Core Pre-Routing Middlewares
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compressionMiddleware);
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  app.use(express.json({ limit: serverConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: serverConfig.bodyLimit }));

  // 2. Rate Limiting on API endpoints
  app.use('/api', apiRateLimiter);

  // 3. Mount Modular API Routes
  app.use('/api', apiRouter);

  // 4. API 404 Not Found Handler
  app.use('/api', notFoundHandler);

  // 5. Centralized Error Handling Middleware
  app.use(errorHandlerMiddleware);

  return app;
}

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

/**
 * Boots HTTP server and registers graceful lifecycle shutdown hooks
 */
export async function startServer(): Promise<Express> {
  const app = createExpressApp();
  const PORT = serverConfig.port;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !isTestEnv) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  let server: http.Server | null = null;

  if (!isTestEnv) {
    server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`RiskLens AI Production Server listening on port ${PORT}`, {
        port: PORT,
        config: redactConfig(serverConfig),
        nodeVersion: process.version,
      });
    });

    // -------------------------------------------------------------
    // Graceful Shutdown Handler (SIGINT, SIGTERM)
    // -------------------------------------------------------------
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      // Fallback timer to force exit if connections hang
      const forceExitTimer = setTimeout(() => {
        logger.error(`Graceful shutdown timed out. Forcing process exit.`);
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      if (server) {
        server.close(async (err) => {
          if (err) {
            logger.error('Error during HTTP server close:', { error: err });
          } else {
            logger.info('HTTP server closed successfully.');
          }

          try {
            await db.close();
            logger.info('Database connection safely closed.');
          } catch (dbErr) {
            logger.error('Error closing database connections:', { error: dbErr });
          }

          logger.flush();
          process.exit(err ? 1 : 0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  return app;
}

if (!isTestEnv) {
  startServer().catch(err => {
    logger.error("Failed to start server:", { error: err });
    process.exit(1);
  });
}
