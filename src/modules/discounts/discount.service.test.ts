import { discountService } from './discount.service.js';

describe('DiscountService', () => {
  it('should apply percentage discount correctly', () => {
    // WELCOME10 gives 10%
    const discount = discountService.calculateDiscount('WELCOME10', 10000);
    expect(discount).toBe(1000);
  });

  it('should reject discount when minOrderValue is not met', () => {
    // SAVE20 requires 5000 min order value
    const discount = discountService.calculateDiscount('SAVE20', 3000);
    expect(discount).toBe(0);
  });

  it('should return 0 for unknown discount codes', () => {
    const discount = discountService.calculateDiscount('NONEXISTENT', 10000);
    expect(discount).toBe(0);
  });
});
