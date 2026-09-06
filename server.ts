import "dotenv/config";
import express, { Express, Request, Response, NextFunction } from "express";
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

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

/**
 * Creates and configures the core Express application instance.
 */
export function createExpressApp(): Express {
  const app = express();

  // Trust first proxy hop (Cloud Run / Nginx / Load Balancer / Reverse Proxy)
  app.set('trust proxy', 1);

  // 1. Security & Core Pre-Routing Middlewares
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compressionMiddleware as any);
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Body Parsers with Raw Body Preservation for Razorpay Webhook Signatures
  app.use(express.json({
    limit: serverConfig.bodyLimit,
    verify: (req: express.Request, _res: express.Response, buf: Buffer) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: serverConfig.bodyLimit }));

  // Ensure DB is initialized for incoming requests
  app.use(async (_req, _res, next) => {
    try {
      if (!db.isInitialized()) {
        await db.initialize();
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  // 2. Rate Limiting on API endpoints
  app.use('/api', apiRateLimiter);

  // 3. Mount Modular API Routes
  app.use('/api', apiRouter);

  // 4. API 404 Not Found Handler for unmatched /api/* requests
  app.use('/api', notFoundHandler);

  // 5. Centralized Error Handling Middleware
  app.use(errorHandlerMiddleware);

  return app;
}

/**
 * Boots HTTP server with full middleware stack (including Vite/SPA serving) and registers graceful lifecycle shutdown hooks.
 */
export async function startServer(): Promise<{ app: Express; server: http.Server | null }> {
  // 1. Initialize Database deterministically before serving requests
  await db.initialize();

  const app = createExpressApp();
  const PORT = serverConfig.port;
  let viteInstance: any = null;

  const httpServer = http.createServer(app);

  // 2. Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production" && !isTestEnv) {
    const { createServer: createViteServer } = await import("vite");
    viteInstance = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Re-attach Centralized Error Handling Middleware after frontend handlers to catch any errors
  app.use(errorHandlerMiddleware);

  if (!isTestEnv) {
    // Surface binding errors (such as EADDRINUSE) explicitly
    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use by another process. Please free port ${PORT} or configure a different PORT.`, {
          port: PORT,
          error: err,
        });
        console.error(`[RiskLens AI Error] Port ${PORT} is already in use. Please terminate existing process or set PORT=<other_port>.`);
      } else {
        logger.error(`HTTP server failed to start: ${err.message}`, { error: err });
        console.error(`[RiskLens AI Error] HTTP server error: ${err.message}`);
      }
      process.exit(1);
    });

    httpServer.listen(PORT, "0.0.0.0", async () => {
      const dbHealth = await db.getHealth();

      logger.info(`RiskLens AI Server listening on port ${PORT}`, {
        port: PORT,
        config: redactConfig(serverConfig),
        nodeVersion: process.version,
      });

      // Deterministic Startup Banner
      console.log('==================================================');
      console.log('RISKLENS AI');
      console.log('==================================================');
      console.log(`Environment: ${serverConfig.env}`);
      console.log(`Database: ${dbHealth.adapter === 'postgres' ? 'PostgreSQL' : dbHealth.adapter}`);
      console.log(`Database status: ${dbHealth.status}`);
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health/live`);
      console.log(`Readiness: http://localhost:${PORT}/api/health/ready`);
      console.log(`Status: READY`);
      console.log('==================================================');
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

      httpServer.close(async (err) => {
        if (err) {
          logger.error('Error during HTTP server close:', { error: err });
        } else {
          logger.info('HTTP server closed successfully.');
        }

        if (viteInstance && typeof viteInstance.close === 'function') {
          try {
            await viteInstance.close();
          } catch (viteErr) {
            logger.warn('Error closing Vite dev server:', { error: viteErr });
          }
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
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  return { app, server: isTestEnv ? null : httpServer };
}

if (!isTestEnv) {
  startServer().catch(err => {
    logger.error("Failed to start server:", { error: err });
    console.error("[RiskLens AI] Fatal startup error:", err);
    process.exit(1);
  });
}
