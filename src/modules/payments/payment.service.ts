export interface ChargeRequest {
  orderId: string;
  amount: number; // in cents
  currency: string;
  paymentMethodId: string;
}

export interface ChargeResponse {
  transactionId: string;
  status: 'succeeded' | 'failed';
  chargedAt: Date;
}

export class PaymentGateway {
  async processCharge(req: ChargeRequest): Promise<ChargeResponse> {
    // Simulate network latency with payment gateway (e.g. Stripe)
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (req.amount <= 0) {
      throw new Error('Charge amount must be positive');
    }

    return {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'succeeded',
      chargedAt: new Date(),
    };
  }
}

export const paymentGateway = new PaymentGateway();
