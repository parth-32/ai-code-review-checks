export interface DiscountRule {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (e.g. 15 for 15%) or fixed cents (e.g. 1000 for $10)
  minOrderValue?: number; // cents
  maxDiscount?: number; // cents
  expiresAt?: Date;
  active: boolean;
}

export class DiscountService {
  private promoCodes: Map<string, DiscountRule> = new Map([
    ['WELCOME10', { code: 'WELCOME10', type: 'percentage', value: 10, active: true }],
    ['SAVE20', { code: 'SAVE20', type: 'percentage', value: 20, minOrderValue: 5000, active: true }],
    ['FLAT5', { code: 'FLAT5', type: 'fixed', value: 500, minOrderValue: 2500, active: true }],
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
    if (rule.type === 'percentage') {
      calculatedDiscount = Math.round((subtotal * rule.value) / 100);
    } else {
      calculatedDiscount = rule.value;
    }

    if (rule.maxDiscount && calculatedDiscount > rule.maxDiscount) {
      calculatedDiscount = rule.maxDiscount;
    }

    return Math.min(calculatedDiscount, subtotal);
  }
}

export const discountService = new DiscountService();
