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
  dataStoreProvider: 'postgres' | 'firestore' | 'memory';
  databaseUrl?: string;
  firestoreProjectId?: string;
  geminiApiKey?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  razorpayMode: 'test' | 'live';
  razorpayDefaultTenantId?: string;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  bodyLimit: string;
  isCloudRun: boolean;
}

function normalizeLogLevel(value: string | undefined, env: ServerConfig['env']): ServerConfig['logLevel'] {
  const normalized = (value || (env === 'production' ? 'INFO' : 'DEBUG')).toUpperCase();
  return ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(normalized)
    ? normalized as ServerConfig['logLevel']
    : env === 'production' ? 'INFO' : 'DEBUG';
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
  const validProviders = ['postgres', 'firestore', 'memory'];
  if (rawConfig.dataStoreProvider && !validProviders.includes(rawConfig.dataStoreProvider)) {
    errors.push(`Invalid DATA_STORE_PROVIDER: "${rawConfig.dataStoreProvider}". Must be "postgres", "firestore" or "memory".`);
  }

  // 4. Production specific checks
  if (rawConfig.env === 'production') {
    if (!rawConfig.databaseUrl) {
      errors.push('Production requires DATABASE_URL.');
    }
    if (process.env.STRICT_DATABASE !== 'true') {
      errors.push('Production requires STRICT_DATABASE=true.');
    }
    if (process.env.RAZORPAY_MODE !== 'live' && process.env.RAZORPAY_MODE !== 'test') {
      errors.push('Production requires an explicit RAZORPAY_MODE=live or RAZORPAY_MODE=test.');
    }
    if (!rawConfig.razorpayKeyId || !rawConfig.razorpayKeySecret) {
      errors.push('Production requires Razorpay API credentials.');
    }
    if (!rawConfig.razorpayWebhookSecret) {
      errors.push('Production requires RAZORPAY_WEBHOOK_SECRET.');
    }
    if (!process.env.TENANT_MEMBERSHIPS_JSON) {
      errors.push('Production requires TENANT_MEMBERSHIPS_JSON.');
    }
    if (!rawConfig.geminiApiKey) {
      warnings.push('GEMINI_API_KEY is not defined in production. Copilot and AI investigation features will run in mock/fallback mode.');
    }
    if (rawConfig.dataStoreProvider !== 'postgres') {
      errors.push('Production requires DATA_STORE_PROVIDER=postgres.');
    }
  }

  if (rawConfig.razorpayMode === 'live' && rawConfig.env !== 'production') {
    errors.push('RAZORPAY_MODE=live is only permitted when NODE_ENV=production.');
  }
  if (rawConfig.razorpayKeyId) {
    const expectedPrefix = rawConfig.razorpayMode === 'live' ? 'rzp_live_' : 'rzp_test_';
    if (!rawConfig.razorpayKeyId.startsWith(expectedPrefix)) {
      errors.push(`RAZORPAY_KEY_ID does not match RAZORPAY_MODE=${rawConfig.razorpayMode}.`);
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
    logLevel: normalizeLogLevel(process.env.LOG_LEVEL, env),
    dataStoreProvider: (process.env.DATA_STORE_PROVIDER as any) || (process.env.DATABASE_URL ? 'postgres' : (isTest ? 'memory' : 'firestore')),
    databaseUrl: process.env.DATABASE_URL,
    firestoreProjectId: process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'risklens-ai-prod',
    geminiApiKey: process.env.GEMINI_API_KEY,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantApiKey: process.env.QDRANT_API_KEY,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    razorpayMode: process.env.RAZORPAY_MODE === 'live' ? 'live' : 'test',
    razorpayDefaultTenantId: process.env.RAZORPAY_DEFAULT_TENANT_ID || 'tenant_razorpay_merchant',
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
 * Redacts sensitive API keys and tokens for safe logging and status reporting.
 * Never prints fragments of secrets or tokens.
 */
export function redactSecret(secret?: string): string {
  if (!secret || secret.trim().length === 0) return '[NOT_CONFIGURED]';
  return '[CONFIGURED]';
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
    databaseUrl: config.databaseUrl ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
    firestoreProjectId: config.firestoreProjectId,
    geminiApiKey: redactSecret(config.geminiApiKey),
    qdrantUrl: config.qdrantUrl ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
    qdrantApiKey: redactSecret(config.qdrantApiKey),
    razorpayKeyId: redactSecret(config.razorpayKeyId),
    razorpayKeySecret: redactSecret(config.razorpayKeySecret),
    razorpayWebhookSecret: redactSecret(config.razorpayWebhookSecret),
    razorpayMode: config.razorpayMode,
    razorpayDefaultTenantId: config.razorpayDefaultTenantId,
    allowedOrigins: config.allowedOrigins,
    rateLimit: config.rateLimit,
    bodyLimit: config.bodyLimit,
    isCloudRun: config.isCloudRun,
  };
}

export const serverConfig = loadServerConfig();
