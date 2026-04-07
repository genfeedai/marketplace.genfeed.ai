import type { User } from '@clerk/backend';

export interface IClerkPublicMetadata {
  user: string;
  organization: string;
  brand: string;
  isSuperAdmin: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionStatus?: string;
  subscriptionTier?: string;
}

export function getPublicMetadata(user: User): IClerkPublicMetadata {
  return user.publicMetadata as unknown as IClerkPublicMetadata;
}

export function getIsSuperAdmin(user: User): boolean {
  const publicMetadata = getPublicMetadata(user);
  return publicMetadata.isSuperAdmin === true;
}
