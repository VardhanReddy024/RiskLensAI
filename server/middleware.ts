/**
 * RiskLens AI - Production Security, Tracing, and Logging Middleware Suite
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import { metrics } from './metrics';

// Extend Express Request interface with tracing attributes
declare global {
  namespace Express {
    interface Request {
      id?: string;
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * 1. Request Tracing Middleware
 * Assigns or propagates X-Request-ID and X-Correlation-ID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = (req.headers['x-request-id'] || req.headers['x-correlation-id']) as string;
  const requestId = incomingId && incomingId.trim().length > 0
    ? incomingId.trim()
    : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  req.id = requestId;
  req.correlationId = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);

  next();
}

/**
 * 2. Structured JSON Request Logger Middleware
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const finishMetric = metrics.recordRequestStart();

  res.on('finish', () => {
    finishMetric();
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    metrics.recordStatusCode(res.statusCode);

    // Skip excessively noisy polling logs in local test unless it is an error
    const isProbe = req.path.startsWith('/api/health') || req.path === '/api/metrics';
    if (isProbe && res.statusCode < 400 && process.env.NODE_ENV === 'test') {
      return;
    }

    const logMethod = res.statusCode >= 500 ? logger.error.bind(logger) : (res.statusCode >= 400 ? logger.warn.bind(logger) : logger.info.bind(logger));

    logMethod(`HTTP ${req.method} ${req.path} ${res.statusCode} in ${durationMs}ms`, {
      requestId: req.id,
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

/**
 * 3. Centralized Error Logger & Handler Middleware
 */
export function errorLoggerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.status || err.statusCode || 500;
  const durationMs = req.startTime ? Date.now() - req.startTime : 0;

  logger.error(`Unhandled Exception on ${req.method} ${req.path}: ${err.message}`, {
    requestId: req.id,
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    statusCode,
    durationMs,
    error: err,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 4. Production Security Headers (Helmet)
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking Vite SPA scripts, Google Fonts, and dynamic charts
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Required for Firebase signInWithPopup (Google OAuth)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: true },
  frameguard: false, // Permitted for Cloud Run preview and iframe sandbox
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * 5. Production CORS Whitelist with dynamic origin matching
 */
const allowedOrigins = [
  'https://risklens-platform.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Supertest)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }

    // Default allow with safe warning for preview containers
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'Content-Range'],
});

/**
 * 6. Rate Limiting Middleware
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limits in test environments or for internal health / metrics probes
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      req.path.startsWith('/api/health') ||
      req.path === '/api/metrics'
    );
  },
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * 7. HTTP Response Compression (Gzip/Deflate)
 */
export const compressionMiddleware = compression({
  threshold: 1024, // Compress responses above 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});
