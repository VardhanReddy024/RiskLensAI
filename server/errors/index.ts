/**
 * RiskLens AI - Standardized Application Error Hierarchy
 * 
 * Provides:
 * - AppError: Abstract base operational error
 * - ValidationError: HTTP 400 Bad Request
 * - NotFoundError: HTTP 404 Not Found
 * - RateLimitError: HTTP 429 Too Many Requests
 * - UnauthorizedError: HTTP 401 Unauthorized
 * - ForbiddenError: HTTP 403 Forbidden
 * - InternalServerError: HTTP 500 Internal Server Error
 */

export interface ErrorDetails {
  [key: string]: any;
}

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Capture clean stack trace omitting constructor
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): StandardErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request payload or parameters', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests from this IP. Please retry later.', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required to access this resource', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden for current credentials', details?: any) {
    super(message, 403, 'FORBIDDEN', details, true);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, true);
  }
}
