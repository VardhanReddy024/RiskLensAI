/**
 * RiskLens AI - Enterprise Structured JSON Logger & Tracing Engine
 * 
 * Provides:
 * - JSON-formatted structured logging
 * - Log Levels: DEBUG, INFO, WARN, ERROR
 * - Correlation IDs / Request ID propagation
 * - ISO timestamps on every log entry
 * - In-memory audit ring buffer for diagnostics and flush on shutdown
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  version: string;
  environment: string;
  correlationId?: string;
  requestId?: string;
  durationMs?: number;
  statusCode?: number;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

export class LoggerService {
  private static instance: LoggerService | null = null;
  private serviceName = 'risklens-ai';
  private version = '2.4.0-prod';
  private environment = process.env.NODE_ENV || 'development';
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
  private ringBuffer: StructuredLogEntry[] = [];
  private readonly maxBufferSize = 250;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    meta?: {
      correlationId?: string;
      requestId?: string;
      durationMs?: number;
      statusCode?: number;
      method?: string;
      path?: string;
      ip?: string;
      userAgent?: string;
      error?: Error | any;
      [key: string]: any;
    }
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
    };

    if (meta) {
      const {
        correlationId,
        requestId,
        durationMs,
        statusCode,
        method,
        path,
        ip,
        userAgent,
        error,
        ...customMeta
      } = meta;

      if (correlationId) entry.correlationId = correlationId;
      if (requestId) entry.requestId = requestId;
      if (typeof durationMs === 'number') entry.durationMs = durationMs;
      if (typeof statusCode === 'number') entry.statusCode = statusCode;
      if (method) entry.method = method;
      if (path) entry.path = path;
      if (ip) entry.ip = ip;
      if (userAgent) entry.userAgent = userAgent;

      if (error) {
        entry.error = {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack,
        };
      }

      if (Object.keys(customMeta).length > 0) {
        entry.metadata = customMeta;
      }
    }

    // Retain in ring buffer for diagnostics and metrics
    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }

    return entry;
  }

  private write(entry: StructuredLogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const serialized = JSON.stringify(entry);

    if (entry.level === 'ERROR') {
      console.error(serialized);
    } else if (entry.level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public debug(message: string, meta?: Record<string, any>): void {
    const entry = this.formatEntry('DEBUG', message, meta);
    this.write(entry);
  }

  public info(message: string, meta?: Record<string, any>): void {
    const entry = this.formatEntry('INFO', message, meta);
    this.write(entry);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    const entry = this.formatEntry('WARN', message, meta);
    this.write(entry);
  }

  public error(message: string, meta?: Record<string, any> | Error): void {
    const metaObj = meta instanceof Error ? { error: meta } : meta;
    const entry = this.formatEntry('ERROR', message, metaObj);
    this.write(entry);
  }

  public getRecentLogs(limit = 50): StructuredLogEntry[] {
    return this.ringBuffer.slice(-Math.min(limit, this.ringBuffer.length));
  }

  public flush(): void {
    // In production stdout streams, process.stdout.write is synchronized, but this hook allows graceful drain
    if (process.stdout && typeof (process.stdout as any).uncork === 'function') {
      (process.stdout as any).uncork();
    }
  }
}

export const logger = LoggerService.getInstance();
