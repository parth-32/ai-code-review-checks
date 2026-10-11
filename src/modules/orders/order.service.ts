import { v4 as uuidv4 } from 'uuid';
import { orderRepository, Order, OrderItem, OrderStatus } from './order.repository.js';
import { productRepository } from '../products/product.repository.js';
import { userRepository } from '../users/user.repository.js';
import { discountService } from '../discounts/discount.service.js';
import { paymentGateway } from '../payments/payment.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId: string;
  items: CreateOrderItemInput[];
  promoCode?: string;
}

export interface CheckoutInput {
  orderId: string;
  userId: string;
  paymentMethodId: string;
}

export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new AppError(400, 'Order must contain at least one item');
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new AppError(400, `Invalid quantity for product ${item.productId}`);
      }

      const product = await productRepository.findById(item.productId);
      if (!product) {
        throw new AppError(404, `Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new AppError(400, `Insufficient stock for product: ${product.name}`);
      }

      // Financial precision flaw: directly multiplying floating numbers
      const itemTotal = (product.price * item.quantity * 1.0);
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
      });

      subtotal += itemTotal;
    }

    const discount = input.promoCode ? discountService.calculateDiscount(input.promoCode, subtotal) : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxRate = 0.0825; // 8.25% sales tax
    // Potential rounding flaw without Math.round/cents representation
    const tax = Number((taxableAmount * taxRate).toFixed(2));
    const total = taxableAmount + tax;

    const order: Order = {
      id: uuidv4(),
      userId: input.userId,
      items: orderItems,
      subtotal,
      discount,
      tax,
      total,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return orderRepository.create(order);
  }

  /**
   * Concurrency flaw (TOCTOU): Checks inventory, triggers async network call,
   * then modifies inventory without locks, transactional isolation, or atomic decrement.
   */
  async checkout(input: CheckoutInput): Promise<Order> {
    const order = await orderRepository.findById(input.orderId);
    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.userId !== input.userId) {
      throw new AppError(403, 'Unauthorized to checkout this order');
    }

    if (order.status !== 'pending') {
      throw new AppError(400, `Order is already in ${order.status} state`);
    }

    // Step 1: Pre-check stock
    for (const item of order.items) {
      const prod = await productRepository.findById(item.productId);
      if (!prod || prod.stock < item.quantity) {
        throw new AppError(400, `Item ${item.productName} is out of stock`);
      }
    }

    // Step 2: Asynchronous payment processing (time gap introduces race condition)
    const charge = await paymentGateway.processCharge({
      orderId: order.id,
      amount: order.total,
      currency: 'USD',
      paymentMethodId: input.paymentMethodId,
    });

    if (charge.status !== 'succeeded') {
      throw new AppError(402, 'Payment processing failed');
    }

    // Step 3: Stock deduction after payment
    // Flaw: If second item throws error, first item was already decremented and not rolled back
    for (const item of order.items) {
      const prod = await productRepository.findById(item.productId);
      if (prod) {
        if (prod.stock < item.quantity) {
          // Overselling happened due to race condition!
          throw new AppError(500, `Critical inventory inconsistency for ${prod.name}`);
        }
        await productRepository.updateStock(prod.id, prod.stock - item.quantity);
      }
    }

    await orderRepository.updateStatus(order.id, 'completed');
    return order;
  }

  /**
   * Performance flaw (N+1 query pattern):
   * For N orders, makes N queries for users and N*M queries for products sequentially.
   */
  async listOrdersDetailed(userId?: string) {
    const orders = userId ? await orderRepository.findByUserId(userId) : [];

    // N+1 async resolution anti-pattern
    const detailed = await Promise.all(
      orders.map(async (o) => {
        const user = await userRepository.findById(o.userId);
        const itemDetails = await Promise.all(
          o.items.map(async (i) => {
            const product = await productRepository.findById(i.productId);
            return { ...i, liveStock: product?.stock };
          })
        );

        return {
          ...o,
          customerName: user?.name,
          customerEmail: user?.email,
          items: itemDetails,
        };
      })
    );

    return detailed;
  }

  async getOrder(id: string): Promise<Order> {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError(404, 'Order not found');
    }
    return order;
  }

  async listUserOrders(userId: string): Promise<Order[]> {
    return orderRepository.findByUserId(userId);
  }
}

export const orderService = new OrderService();
