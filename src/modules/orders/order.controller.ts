import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class OrderController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { items, promoCode } = req.body;
      const order = await orderService.createOrder({
        userId: req.user.id,
        items,
        promoCode,
      });

      res.status(201).json({
        status: 'success',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const order = await orderService.getOrder(id);

      // Simple authorization: customers can only view their own orders
      if (req.user.role !== 'admin' && order.userId !== req.user.id) {
        throw new AppError(403, 'Forbidden: Cannot access orders of other users');
      }

      res.status(200).json({
        status: 'success',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const orders = await orderService.listUserOrders(req.user.id);
      res.status(200).json({
        status: 'success',
        results: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        throw new AppError(400, 'paymentMethodId is required for checkout');
      }

      const order = await orderService.checkout({
        orderId: id,
        userId: req.user.id,
        paymentMethodId,
      });

      res.status(200).json({
        status: 'success',
        message: 'Order checked out and paid successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async listDetailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const detailed = await orderService.listOrdersDetailed(req.user.id);
      res.status(200).json({
        status: 'success',
        results: detailed.length,
        data: detailed,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
