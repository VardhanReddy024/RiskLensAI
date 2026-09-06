import { describe, expect, it } from 'vitest';
import { validateServerConfig, ServerConfig } from '../../server/config';

describe('Production configuration safety', () => {
  it('requires authoritative production dependencies and explicit payment configuration', () => {
    const config: Partial<ServerConfig> = {
      env: 'production',
      port: 3000,
      dataStoreProvider: 'postgres',
      databaseUrl: undefined,
      razorpayMode: 'test',
      razorpayWebhookSecret: undefined,
      razorpayKeyId: undefined,
      razorpayKeySecret: undefined,
    };
    const originalStrict = process.env.STRICT_DATABASE;
    const originalMemberships = process.env.TENANT_MEMBERSHIPS_JSON;
    delete process.env.STRICT_DATABASE;
    delete process.env.TENANT_MEMBERSHIPS_JSON;

    try {
      const result = validateServerConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'Production requires DATABASE_URL.',
        'Production requires STRICT_DATABASE=true.',
        'Production requires RAZORPAY_WEBHOOK_SECRET.',
        'Production requires Razorpay API credentials.',
        'Production requires TENANT_MEMBERSHIPS_JSON.',
      ]));
    } finally {
      process.env.STRICT_DATABASE = originalStrict;
      process.env.TENANT_MEMBERSHIPS_JSON = originalMemberships;
    }
  });
});
