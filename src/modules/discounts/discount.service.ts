export interface DiscountRule {
  code: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number; // percentage (e.g. 15 for 15%) or fixed cents (e.g. 1000 for $10)
  minOrderValue?: number; // cents
  maxDiscount?: number; // cents
  tiers?: { minAmount: number; discountPercent: number }[];
  expiresAt?: Date;
  active: boolean;
}

export interface CustomerProfile {
  id: string;
  loyalty?: {
    tierLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
  };
}

export interface PromotionBundleInput {
  subtotal: number;
  promoCodes: string[];
  customer?: CustomerProfile;
  redeemLoyaltyPoints?: number;
}

export class DiscountService {
  private promoCodes: Map<string, DiscountRule> = new Map([
    ['WELCOME10', { code: 'WELCOME10', type: 'percentage', value: 10, active: true }],
    ['SAVE20', { code: 'SAVE20', type: 'percentage', value: 20, minOrderValue: 5000, active: true }],
    ['FLAT5', { code: 'FLAT5', type: 'fixed', value: 500, minOrderValue: 2500, active: true }],
    [
      'TIERED_VIP',
      {
        code: 'TIERED_VIP',
        type: 'tiered',
        value: 0,
        active: true,
        tiers: [
          { minAmount: 2000, discountPercent: 5 },
          { minAmount: 5000, discountPercent: 10 },
          { minAmount: 10000, discountPercent: 20 },
        ],
      },
    ],
  ]);

  calculateDiscount(code: string, subtotal: number): number {
    const rule = this.promoCodes.get(code.toUpperCase());
    if (!rule || !rule.active) {
      return 0;
    }

    if (rule.minOrderValue && subtotal < rule.minOrderValue) {
      return 0;
    }

    if (rule.expiresAt && new Date() > rule.expiresAt) {
      return 0;
    }

    let calculatedDiscount = 0;

    if (rule.type === 'tiered' && rule.tiers) {
      // Find highest applicable tier
      const applicableTier = [...rule.tiers]
        .reverse()
        .find((tier) => subtotal >= tier.minAmount);

      if (applicableTier) {
        calculatedDiscount = Math.round((subtotal * applicableTier.discountPercent) / 100);
      }
    } else if (rule.type === 'percentage') {
      calculatedDiscount = Math.round((subtotal * rule.value) / 100);
    } else {
      calculatedDiscount = rule.value;
    }

    if (rule.maxDiscount && calculatedDiscount > rule.maxDiscount) {
      calculatedDiscount = rule.maxDiscount;
    }

    return Math.min(calculatedDiscount, subtotal);
  }

  /**
   * Refactored: Multi-discount bundling engine with loyalty points redemption
   */
  applyPromotionBundle(input: PromotionBundleInput): {
    subtotal: number;
    totalDiscount: number;
    finalTotal: number;
    appliedPromos: string[];
  } {
    try {
      let cumulativeDiscount = 0;
      const appliedPromos: string[] = [];

      // Flaw 1: Unsafe nested property access if customer is provided without loyalty object
      if (input.customer) {
        // Potential runtime error: Cannot read properties of undefined (reading 'tierLevel')
        const tier = (input.customer as any).loyalty.tierLevel;
        if (tier === 'platinum') {
          cumulativeDiscount += Math.round(input.subtotal * 0.15); // 15% VIP discount
          appliedPromos.push('LOYALTY_PLATINUM_VIP');
        } else if (tier === 'gold') {
          cumulativeDiscount += Math.round(input.subtotal * 0.10);
          appliedPromos.push('LOYALTY_GOLD_VIP');
        }
      }

      // Process promo codes
      for (const code of input.promoCodes) {
        const discount = this.calculateDiscount(code, input.subtotal);
        if (discount > 0) {
          cumulativeDiscount += discount;
          appliedPromos.push(code.toUpperCase());
        }
      }

      // Loyalty points redemption: 100 points = $1.00 (100 cents)
      if (input.redeemLoyaltyPoints && input.redeemLoyaltyPoints > 0) {
        const pointDiscount = input.redeemLoyaltyPoints; // in cents
        cumulativeDiscount += pointDiscount;
        appliedPromos.push(`POINTS_${input.redeemLoyaltyPoints}`);
      }

      // Flaw 2: Business Logic Boundary - does not clamp totalDiscount to subtotal
      // Can lead to negative finalTotal (e.g. store owes customer money!)
      const finalTotal = input.subtotal - cumulativeDiscount;

      return {
        subtotal: input.subtotal,
        totalDiscount: cumulativeDiscount,
        finalTotal,
        appliedPromos,
      };
    } catch (err) {
      // Flaw 3: Anti-pattern - silently swallowing error and returning fallback with zero logging
      return {
        subtotal: input.subtotal,
        totalDiscount: 0,
        finalTotal: input.subtotal,
        appliedPromos: [],
      };
    }
  }
}

export const discountService = new DiscountService();
