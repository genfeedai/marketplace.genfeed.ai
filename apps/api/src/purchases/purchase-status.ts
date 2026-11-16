import { PurchaseStatus } from '@genfeedai/contracts/enums';

/**
 * The only moves a purchase may make. Failed, refunded and disputed purchases
 * are final here, so a late or out-of-order Stripe event cannot reopen them.
 * A refund may arrive before the completed event of the same payment, so a
 * pending purchase can be refunded directly.
 */
const ALLOWED_TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  [PurchaseStatus.PENDING]: [
    PurchaseStatus.PROCESSING,
    PurchaseStatus.COMPLETED,
    PurchaseStatus.FAILED,
    PurchaseStatus.REFUNDED,
  ],
  [PurchaseStatus.PROCESSING]: [
    PurchaseStatus.COMPLETED,
    PurchaseStatus.FAILED,
    PurchaseStatus.REFUNDED,
  ],
  [PurchaseStatus.COMPLETED]: [PurchaseStatus.REFUNDED],
  [PurchaseStatus.FAILED]: [],
  [PurchaseStatus.REFUNDED]: [],
  [PurchaseStatus.DISPUTED]: [],
};

export function canTransitionPurchase(
  from: string,
  to: PurchaseStatus,
): boolean {
  return (ALLOWED_TRANSITIONS[from as PurchaseStatus] ?? []).includes(to);
}

export function purchaseStatusesThatMayBecome(to: PurchaseStatus): string[] {
  return Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, targets]) => targets.includes(to))
    .map(([from]) => from);
}
