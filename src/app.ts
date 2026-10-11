import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authController } from './modules/auth/auth.controller.js';
import { orderController } from './modules/orders/order.controller.js';
import { productRepository } from './modules/products/product.repository.js';
import { authGuard } from './middleware/authGuard.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Application {
  const app = express();

  // Global Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.post('/api/v1/auth/register', (req, res, next) => authController.register(req, res, next));
  app.post('/api/v1/auth/login', (req, res, next) => authController.login(req, res, next));
  app.post('/api/v1/auth/refresh', (req, res, next) => authController.refreshToken(req, res, next));
  app.post('/api/v1/auth/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
  app.post('/api/v1/auth/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

  // Product Catalog
  app.get('/api/v1/products', async (req, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const products = await productRepository.list(category);
      res.status(200).json({ status: 'success', data: products });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/products/:id', async (req, res, next) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const product = await productRepository.findById(id);
      if (!product) {
        res.status(404).json({ status: 'error', message: 'Product not found' });
        return;
      }
      res.status(200).json({ status: 'success', data: product });
    } catch (err) {
      next(err);
    }
  });

  // Order Routes (Protected)
  app.post('/api/v1/orders', authGuard, (req, res, next) => orderController.create(req, res, next));
  app.get('/api/v1/orders/mine', authGuard, (req, res, next) => orderController.listMine(req, res, next));
  app.get('/api/v1/orders/:id', authGuard, (req, res, next) => orderController.getById(req, res, next));

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
