export interface TenantMembership {
  uid: string;
  email: string;
  tenantId: string;
  role: string;
}

interface MembershipConfigEntry {
  uid?: string;
  email?: string;
  tenantId: string;
  role: string;
}

let membershipConfig: MembershipConfigEntry[] | null = null;

function loadMembershipConfig(): MembershipConfigEntry[] {
  if (membershipConfig) return membershipConfig;
  const raw = process.env.TENANT_MEMBERSHIPS_JSON;
  if (!raw) {
    membershipConfig = [];
    return membershipConfig;
  }
  try {
    const parsed = JSON.parse(raw);
    membershipConfig = Array.isArray(parsed) ? parsed : [];
  } catch {
    membershipConfig = [];
  }
  return membershipConfig;
}

export function resolveTenantMembership(uid: string, email: string, role: string): TenantMembership | null {
  const configured = loadMembershipConfig().find(entry =>
    (entry.uid && entry.uid === uid) || (entry.email && entry.email.toLowerCase() === email.toLowerCase())
  );
  if (configured?.tenantId && configured.role) {
    return { uid, email, tenantId: configured.tenantId, role: configured.role };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) return null;

  // Local test tokens have a deterministic, server-side-only fixture membership.
  return {
    uid,
    email,
    tenantId: `tenant_${email.split('@')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'default'}`,
    role,
  };
}

export function resetMembershipConfigForTesting(): void {
  membershipConfig = null;
}
