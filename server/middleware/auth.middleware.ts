/**
 * RiskLens AI - Server-Side Authentication Middleware
 * 
 * Verifies cryptographically signed JWTs and Firebase ID tokens.
 * Attaches verified user context and derived tenant ID to Express Request.
 * Never logs raw tokens, secrets, or internal crypto details.
 */

import { Request, Response, NextFunction } from 'express';
import { jwtVerify, SignJWT, decodeProtectedHeader, createRemoteJWKSet } from 'jose';
import { logger } from '../logger';
import { resolveTenantMembership } from '../auth/membership';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  tenantId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
      rawBody?: Buffer;
    }
  }
}

// Google Firebase public JWKS remote key set for verifying Firebase ID tokens (RS256)
let firebaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getFirebaseJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!firebaseJwks) {
    firebaseJwks = createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    );
  }
  return firebaseJwks;
}

/**
 * Returns the configured JWT secret key as Uint8Array for HMAC verification
 */
export function getJwtSecretKey(overrideSecret?: string): Uint8Array {
  const secret =
    overrideSecret ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'risklens-ai-default-dev-secret-minimum-32-chars-key');
  return new TextEncoder().encode(secret);
}

/**
 * Helper to generate cryptographically signed JWTs for testing or internal auth issuance
 */
export async function createSignedToken(
  payload: Record<string, any>,
  secretKey?: string,
  expiresIn = '1h'
): Promise<string> {
  const secret = getJwtSecretKey(secretKey);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Derives consistent tenant identity from user email or tenant claim
 */
export function deriveTenantId(email: string, explicitTenant?: string): string {
  if (explicitTenant && explicitTenant.trim().length > 0) {
    return explicitTenant.trim();
  }
  if (!email || !email.includes('@')) {
    return 'default_tenant';
  }
  const domain = email.split('@')[1].toLowerCase().replace(/[^a-z0-9]/g, '_');
  // Specialized domain mapping for multi-tenant isolation
  return `tenant_${domain}`;
}

/**
 * Parses and cryptographically validates an authentication token.
 * Rejects unsigned tokens, alg=none, expired tokens, and fake tokens in production.
 */
export async function verifyAuthToken(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1];
  if (!token || token.trim().length === 0) {
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isDevOrTest =
    !isProduction &&
    (process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      process.env.ALLOW_DEV_TEST_TOKENS === 'true');

  // 1. Explicitly gated Developer / Test token support
  // STRICT RULE: Never allow test or mock tokens in production!
  if (isDevOrTest) {
    if (
      token.startsWith('TEST_TOKEN_') ||
      token.startsWith('STUDIO_TOKEN_') ||
      token === 'mock-valid-token'
    ) {
      const rawEmail = token.replace(/^(TEST_TOKEN_|STUDIO_TOKEN_)/, '').toLowerCase();
      const email = rawEmail.includes('@')
        ? rawEmail
        : token === 'mock-valid-token'
          ? 'analyst@risklens.ai'
          : `${rawEmail}@risklens.ai`;
      const tenantId = deriveTenantId(email);

      return {
        uid: `UID_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email,
        displayName: 'Senior Fraud Analyst',
        role: 'senior_fraud_analyst',
        tenantId,
      };
    }
  }

  // If in production and a test/mock token is passed, reject immediately
  if (
    token.startsWith('TEST_TOKEN_') ||
    token.startsWith('STUDIO_TOKEN_') ||
    token === 'mock-valid-token'
  ) {
    return null;
  }

  // 2. Cryptographic JWT Verification
  try {
    // Decode protected header to check algorithm without trusting payload
    const protectedHeader = decodeProtectedHeader(token);

    // Explicitly reject alg=none or missing algorithm
    if (!protectedHeader.alg || protectedHeader.alg.toLowerCase() === 'none') {
      return null;
    }

    let verifiedPayload: Record<string, any>;

    if (protectedHeader.alg === 'HS256') {
      const secret = getJwtSecretKey();
      if (!secret || secret.length === 0) {
        if (isProduction) {
          logger.error('[Auth] JWT_SECRET is not configured in production environment.');
          return null;
        }
      }

      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });
      verifiedPayload = payload;
    } else if (protectedHeader.alg === 'RS256') {
      // Check if Firebase ID token
      const jwks = getFirebaseJwks();
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_CLOUD_PROJECT;
      if (!projectId) return null;
      const { payload } = await jwtVerify(token, jwks, {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });
      verifiedPayload = payload;
      const firebaseClaims = verifiedPayload.firebase as { sign_in_provider?: string } | undefined;
      if (!verifiedPayload.auth_time || !firebaseClaims?.sign_in_provider) return null;
    } else {
      // Unsupported algorithm
      return null;
    }

    // Cryptographic signature verified successfully; now inspect claims
    const email =
      (verifiedPayload.email as string) ||
      (verifiedPayload.user_email as string) ||
      (verifiedPayload.sub ? `${verifiedPayload.sub}@risklens.ai` : undefined);

    if (!email || !email.includes('@')) {
      return null;
    }

    const uid =
      (verifiedPayload.sub as string) ||
      (verifiedPayload.user_id as string) ||
      (verifiedPayload.uid as string) ||
      `UID_${Date.now()}`;

    const role =
      (verifiedPayload.role as string) ||
      (email.includes('admin') ? 'lead_fraud_investigator' : 'senior_fraud_analyst');

    const tenantId = deriveTenantId(email);

    return {
      uid,
      email,
      displayName:
        (verifiedPayload.name as string) ||
        (verifiedPayload.displayName as string) ||
        email.split('@')[0],
      role,
      tenantId,
    };
  } catch (err: any) {
    // JWT signature failed, expired, or malformed
    // Never leak cryptographic details or stack traces
    return null;
  }
}

/**
 * Authentication Middleware: Enforces authentication on protected routes
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const user = await verifyAuthToken(authHeader);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid authentication token required to access this resource.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const membership = resolveTenantMembership(user.uid, user.email, user.role);
  if (!membership) {
    res.status(403).json({
      success: false,
      error: 'Authenticated user has no tenant membership.',
      code: 'TENANT_MEMBERSHIP_REQUIRED',
    });
    return;
  }

  req.user = { ...user, tenantId: membership.tenantId, role: membership.role };
  req.tenantId = membership.tenantId;

  next();
}

/**
 * Optional Authentication Middleware: Attaches user identity if present, but does not reject if missing
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const user = await verifyAuthToken(authHeader);
    if (user) {
      req.user = user;
      req.tenantId = user.tenantId;
    }
  }
  next();
}

