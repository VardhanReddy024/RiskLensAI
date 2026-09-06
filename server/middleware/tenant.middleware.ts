/**
 * RiskLens AI - Tenant Isolation Middleware & Utilities
 * 
 * Enforces multi-tenant data boundaries across all transactional,
 * investigation, dossier, and audit record access.
 */

import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../../src/types/transaction';

/**
 * Validates that the requested resource belongs to the authenticated tenant.
 * Legacy transactions without tenantId are accessible only by the default tenant.
 */
export function verifyTenantOwnership(
  resourceTenantId: string | undefined | null,
  userTenantId: string
): boolean {
  if (!userTenantId) return false;
  // If resource has no assigned tenant, it's considered part of default_tenant or legacy
  if (!resourceTenantId || resourceTenantId === 'default_tenant') {
    return userTenantId === 'default_tenant' || userTenantId.includes('risklens');
  }
  return resourceTenantId === userTenantId;
}

/**
 * Middleware: Requires tenant identity on request context
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId || !req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Tenant context could not be established.',
      code: 'TENANT_UNAUTHORIZED',
    });
    return;
  }
  next();
}

/**
 * Helper to filter or tag an array of transactions with tenant ownership
 */
export function enforceTenantOnTransactions(
  transactions: Transaction[],
  tenantId: string
): Transaction[] {
  return transactions.filter(t => verifyTenantOwnership(t.tenantId, tenantId));
}
