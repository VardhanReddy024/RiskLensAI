/**
 * RiskLens AI - Production Security, Tracing, and Logging Middleware Suite
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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
  // Only log API requests and full navigations; skip Vite dev assets and static module requests
  const isApi = req.path.startsWith('/api');
  const isDevAsset = req.path.startsWith('/src/') ||
    req.path.startsWith('/@') ||
    req.path.startsWith('/node_modules/') ||
    req.path.endsWith('.tsx') ||
    req.path.endsWith('.ts') ||
    req.path.endsWith('.jsx') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.svg') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.ico');

  if (!isApi && isDevAsset) {
    return next();
  }

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

  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = (statusCode >= 500 && isProd)
    ? 'An unexpected internal server error occurred.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
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
 * 5. Production CORS Whitelist with strict explicit origin matching
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = ['https://risklens-platform.vercel.app'];

  // Add explicit production frontend origins from environment
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  if (frontendOrigin && frontendOrigin.trim().length > 0) {
    origins.push(...frontendOrigin.split(',').map(o => o.trim()).filter(Boolean));
  }

  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins && envOrigins.trim().length > 0) {
    origins.push(...envOrigins.split(',').map(o => o.trim()).filter(Boolean));
  }

  // Only allow localhost development origins when NOT in production
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    );
  }

  return Array.from(new Set(origins));
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Supertest)
    if (!origin) {
      return callback(null, true);
    }

    const allowed = getAllowedOrigins();

    // Check exact match in configured allowlist
    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    // In development and preview environments only, support preview subdomain patterns
    if (process.env.NODE_ENV !== 'production') {
      if (
        origin.endsWith('.run.app') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
    }

    // Explicit rejection for unauthorized origins (Zero arbitrary origin reflection)
    return callback(null, false);
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
 * 6. API Rate Limiting Middleware
 * Uses Express's sanitized req.ip (honoring trust proxy = 1 for reverse proxies).
 * Never reads leftmost X-Forwarded-For directly to prevent IP spoofing attacks.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: true,
  },
  keyGenerator: (req) => {
    // Safe IP resolution: Use Express req.ip which resolves according to trust proxy
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1');
  },
  skip: (req) => {
    // Skip rate limits in test environments
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return true;
    }

    const url = req.originalUrl || req.url || '';
    const path = req.path || '';

    // Fix: Health and readiness probes must always be exempt regardless of mount prefix
    if (
      url.startsWith('/api/health') ||
      path.startsWith('/health') ||
      url === '/api/metrics' ||
      path === '/metrics'
    ) {
      return true;
    }

    // Fix: Exclude Razorpay webhook ingestion from the general user API rate limiter
    // Webhooks are protected by HMAC-SHA256 signature verification and dedicated webhook limiter
    if (url.startsWith('/api/webhooks') || path.startsWith('/webhooks')) {
      return true;
    }

    return false;
  },
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Dedicated High-Throughput Webhook Rate Limiter for payment gateways (Razorpay).
 * Prevents DDoS/socket-flooding while preventing legitimate webhook bursts from receiving 429.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Generous capacity (10,000 req / 15m) for merchant webhook surges
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: true,
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1');
  },
  skip: () => process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
  message: {
    error: 'Webhook rate limit exceeded. Please verify gateway retry configuration.',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
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
