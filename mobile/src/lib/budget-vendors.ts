import { money } from '@/lib/format';
import { QUANTITY_MODELS, QUOTE_ONLY, estimateTotal } from '@/shared/booking-request';

export interface PricedOffering {
  id: string;
  pricingModel: string;
  price: string | null;
  unitLabel: string | null;
  minQuantity: number | null;
  isPackage?: boolean;
  active?: boolean;
}

export interface VendorService {
  active?: boolean;
  offerings?: PricedOffering[];
}

export interface SuggestedVendor {
  id: string;
  name: string;
  city: string | null;
  categories?: string[];
  portfolio?: string[];
  ratingAvg: number;
  ratingCount: number;
  /** The cheapest active offering's unit price. Null when nothing is publicly priced. */
  startingPrice: number | null;
}

export interface ApplicablePrice {
  /** What a booking comes to at least — the figure compared with the budget. */
  amount: number;
  /** The price as the vendor states it: "Starting from ₹X", "From ₹800 / plate". */
  label: string;
  /** How a per-unit price became `amount`, when it did. */
  detail: string | null;
}

const UNIT: Record<string, string> = {
  per_person: 'person',
  per_item: 'item',
  per_hour: 'hour',
  per_day: 'day',
  per_session: 'session',
};

/**
 * The least a booking with this vendor can come to, worked out the way the
 * server estimates a request: a fixed or "from" price as it stands, a per-unit
 * price times the quantity it applies to. Per-guest prices use the guest count
 * and fall back to the vendor's minimum; other units use the vendor's minimum
 * or one. Quote-only offerings have no amount and are skipped.
 */
export function lowestApplicablePrice(
  services: VendorService[] | undefined,
  guests: number | null,
): ApplicablePrice | null {
  let best: ApplicablePrice | null = null;
  for (const service of services ?? []) {
    if (service.active === false) continue;
    for (const o of service.offerings ?? []) {
      if (o.active === false || QUOTE_ONLY.includes(o.pricingModel)) continue;
      const perUnit = QUANTITY_MODELS.includes(o.pricingModel);
      const quantity = !perUnit
        ? null
        : o.pricingModel === 'per_person'
          ? (guests ?? o.minQuantity)
          : (o.minQuantity ?? 1);
      const amount = estimateTotal(o, quantity);
      if (amount === null) continue;
      const unit = o.unitLabel?.replace(/^per\s+/i, '') || UNIT[o.pricingModel];
      const price: ApplicablePrice = perUnit
        ? {
            amount,
            label: `From ${money(o.price)} / ${unit}`,
            detail: `Est. ${money(amount)} for ${quantity} × ${unit}`,
          }
        : o.pricingModel === 'starting_from'
          ? { amount, label: `Starting from ${money(amount)}`, detail: null }
          : { amount, label: money(amount), detail: o.isPackage ? 'Package' : 'Fixed price' };
      if (!best || amount < best.amount) best = price;
    }
  }
  return best;
}
