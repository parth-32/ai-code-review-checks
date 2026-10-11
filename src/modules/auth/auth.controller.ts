import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        throw new AppError(400, 'Name, email, and password are required');
      }

      const result = await authService.register({ email, password, name });
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError(400, 'Email and password are required');
      }

      const result = await authService.login({ email, password });
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError(400, 'refreshToken is required');
      }

      const tokens = await authService.refreshTokens(refreshToken);
      res.status(200).json({
        status: 'success',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError(400, 'Email address is required');
      }

      const result = await authService.requestPasswordReset(email);
      res.status(200).json({
        status: 'success',
        message: 'Password reset instructions generated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        throw new AppError(400, 'Token and newPassword are required');
      }

      await authService.resetPassword(token, newPassword);
      res.status(200).json({
        status: 'success',
        message: 'Password successfully updated',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
