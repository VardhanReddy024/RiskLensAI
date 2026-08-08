/**
 * RiskLens AI - Server Runtime Configuration & Schema Management
 * 
 * Features:
 * - Strongly typed configuration interface
 * - Runtime schema validation with fail-fast startup for production
 * - Secrets redaction utility for safe logging and diagnostic inspection
 * - Safe fallbacks for development and testing environments
 */

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  dataStoreProvider: 'firestore' | 'memory';
  firestoreProjectId?: string;
  geminiApiKey?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  bodyLimit: string;
  isCloudRun: boolean;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the runtime configuration against environment requirements
 */
export function validateServerConfig(rawConfig: Partial<ServerConfig>): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Port Validation
  if (typeof rawConfig.port !== 'number' || isNaN(rawConfig.port) || rawConfig.port <= 0 || rawConfig.port > 65535) {
    errors.push(`Invalid PORT configuration: "${rawConfig.port}". Must be a valid integer between 1 and 65535.`);
  }

  // 2. Environment Validation
  const validEnvs = ['development', 'production', 'test'];
  if (!rawConfig.env || !validEnvs.includes(rawConfig.env)) {
    errors.push(`Invalid NODE_ENV: "${rawConfig.env}". Expected one of: ${validEnvs.join(', ')}.`);
  }

  // 3. Provider Validation
  const validProviders = ['firestore', 'memory'];
  if (rawConfig.dataStoreProvider && !validProviders.includes(rawConfig.dataStoreProvider)) {
    errors.push(`Invalid DATA_STORE_PROVIDER: "${rawConfig.dataStoreProvider}". Must be "firestore" or "memory".`);
  }

  // 4. Production specific checks
  if (rawConfig.env === 'production') {
    if (!rawConfig.geminiApiKey) {
      warnings.push('GEMINI_API_KEY is not defined in production. Copilot and AI investigation features will run in mock/fallback mode.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Loads, normalizes, and validates the server runtime configuration
 */
export function loadServerConfig(): ServerConfig {
  const env = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
  const isTest = env === 'test' || process.env.VITEST === 'true';
  const isCloudRun = !!process.env.K_SERVICE || !!process.env.CLOUD_RUN_JOB;

  const rawConfig: ServerConfig = {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: ((process.env.LOG_LEVEL as any) || (env === 'production' ? 'INFO' : 'DEBUG')),
    dataStoreProvider: (process.env.DATA_STORE_PROVIDER as any) || 'firestore',
    firestoreProjectId: process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'risklens-ai-prod',
    geminiApiKey: process.env.GEMINI_API_KEY,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantApiKey: process.env.QDRANT_API_KEY,
    allowedOrigins: [
      'https://risklens-platform.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10),
    },
    bodyLimit: process.env.BODY_LIMIT || '50mb',
    isCloudRun,
  };

  const validation = validateServerConfig(rawConfig);

  if (!validation.isValid) {
    const errorSummary = `Configuration Validation Failed:\n- ${validation.errors.join('\n- ')}`;
    if (env === 'production' && !isTest) {
      throw new Error(errorSummary);
    } else {
      console.warn(`[RiskLens AI Config Warning] ${errorSummary}`);
    }
  }

  if (validation.warnings.length > 0 && env !== 'test') {
    validation.warnings.forEach(w => console.warn(`[RiskLens AI Config Notice] ${w}`));
  }

  return rawConfig;
}

/**
 * Redacts sensitive API keys and tokens for safe logging and status reporting
 */
export function redactSecret(secret?: string): string {
  if (!secret || secret.trim().length === 0) return '[NOT_CONFIGURED]';
  if (secret.length <= 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

/**
 * Returns a sanitized copy of ServerConfig with all secrets safely redacted
 */
export function redactConfig(config: ServerConfig): Record<string, any> {
  return {
    env: config.env,
    port: config.port,
    logLevel: config.logLevel,
    dataStoreProvider: config.dataStoreProvider,
    firestoreProjectId: config.firestoreProjectId,
    geminiApiKey: redactSecret(config.geminiApiKey),
    qdrantUrl: config.qdrantUrl ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
    qdrantApiKey: redactSecret(config.qdrantApiKey),
    allowedOrigins: config.allowedOrigins,
    rateLimit: config.rateLimit,
    bodyLimit: config.bodyLimit,
    isCloudRun: config.isCloudRun,
  };
}

export const serverConfig = loadServerConfig();
