export interface MarketplacePrincipal {
  id: string;
  organizationId: string;
  isSuperAdmin: boolean;
  email?: string;
  name?: string;
}

export function getIdentity(user: MarketplacePrincipal) {
  return {
    user: user.id,
    organization: user.organizationId,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export function getIsSuperAdmin(user: MarketplacePrincipal): boolean {
  return user.isSuperAdmin === true;
}
