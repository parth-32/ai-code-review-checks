import { v4 as uuidv4 } from 'uuid';
import { orderRepository, Order, OrderItem } from './order.repository.js';
import { productRepository } from '../products/product.repository.js';
import { discountService } from '../discounts/discount.service.js';
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

      const itemTotal = product.price * item.quantity;
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
    const taxRate = 0.08; // 8% sales tax
    const tax = Math.round(taxableAmount * taxRate);
    const total = taxableAmount + tax;

    // Deduct stock
    for (const item of input.items) {
      const prod = await productRepository.findById(item.productId);
      if (prod) {
        await productRepository.updateStock(prod.id, prod.stock - item.quantity);
      }
    }

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
