/**
 * RiskLens AI - Centralized Express Error Handling Middleware Suite
 * 
 * Standardized JSON Error Response Format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human-readable error description",
 *     "details": { ... }
 *   },
 *   "requestId": "req_...",
 *   "timestamp": "2026-..."
 * }
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../errors';
import { logger } from '../logger';

/**
 * Fallback handler for unmatched API routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl || req.path} not found`));
}

/**
 * Centralized Express Error Handling Middleware
 */
export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }

  // 1. Map to standardized AppError if needed
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    // Malformed JSON payload
    appError = new AppError('Malformed JSON payload in request body', 400, 'BAD_REQUEST', {
      rawError: err.message,
    });
  } else {
    // Unhandled exception
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'An unexpected internal error occurred';
    const code = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST';

    appError = new AppError(message, statusCode, code, err.details, false);
  }

  const durationMs = req.startTime ? Date.now() - req.startTime : 0;
  const requestId = req.id || req.correlationId || `req_${Date.now()}`;

  // 2. Structured log execution
  logger.error(`[Error Handler] ${req.method} ${req.path} failed with ${appError.statusCode} [${appError.code}]: ${appError.message}`, {
    requestId,
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    statusCode: appError.statusCode,
    durationMs,
    errorCode: appError.code,
    details: appError.details,
    error: err,
  });

  // 3. Return standardized JSON response
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
