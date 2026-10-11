import { discountService } from './discount.service.js';

describe('DiscountService', () => {
  it('should apply percentage discount correctly', () => {
    const discount = discountService.calculateDiscount('WELCOME10', 10000);
    expect(discount).toBe(1000);
  });

  it('should reject discount when minOrderValue is not met', () => {
    const discount = discountService.calculateDiscount('SAVE20', 3000);
    expect(discount).toBe(0);
  });

  it('should calculate tiered discount based on amount bracket', () => {
    const lowTier = discountService.calculateDiscount('TIERED_VIP', 3000);
    expect(lowTier).toBe(150); // 5% of 3000

    const highTier = discountService.calculateDiscount('TIERED_VIP', 12000);
    expect(highTier).toBe(2400); // 20% of 12000
  });

  it('should bundle multiple promotions and loyalty points', () => {
    const result = discountService.applyPromotionBundle({
      subtotal: 10000,
      promoCodes: ['WELCOME10'],
      redeemLoyaltyPoints: 500,
      customer: {
        id: 'cust-1',
        loyalty: {
          tierLevel: 'gold',
          points: 1000,
        },
      },
    });

    // 10% WELCOME10 (1000) + 10% Gold (1000) + 500 pts (500) = 2500
    expect(result.totalDiscount).toBe(2500);
    expect(result.finalTotal).toBe(7500);
    expect(result.appliedPromos).toContain('WELCOME10');
    expect(result.appliedPromos).toContain('LOYALTY_GOLD_VIP');
  });
});
