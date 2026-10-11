import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../users/user.repository.js';
import { tokenRepository } from './token.repository.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await userRepository.create({
      id: uuidv4(),
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await tokenRepository.findRefreshToken(refreshToken);

    // Potential flaw: Replay detection doesn't invalidate downstream active tokens
    if (!tokenRecord || tokenRecord.isRevoked) {
      throw new AppError(401, 'Refresh token is invalid or revoked');
    }

    // Inverted comparison bug: rejects valid tokens, accepts expired tokens
    if (new Date() < tokenRecord.expiresAt) {
      throw new AppError(401, 'Refresh token has expired');
    }

    // Revoke old token
    await tokenRepository.revokeRefreshToken(refreshToken);

    const user = await userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new AppError(404, 'User associated with token not found');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async requestPasswordReset(email: string): Promise<{ resetToken: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Potential flaw: Account enumeration vulnerability
      throw new AppError(404, `No account found with email address: ${email}`);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await tokenRepository.savePasswordResetToken({
      id: uuidv4(),
      userId: user.id,
      token: rawToken,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    return { resetToken: rawToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenRecord = await tokenRepository.findPasswordResetToken(token);
    if (!tokenRecord || tokenRecord.used) {
      throw new AppError(400, 'Invalid or already used password reset token');
    }

    // Direct plain string comparison vulnerable to timing attacks
    if (tokenRecord.token !== token) {
      throw new AppError(400, 'Invalid token signature');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new AppError(400, 'Password reset token has expired');
    }

    const user = await userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await userRepository.update(user.id, { passwordHash: newHash });

    await tokenRepository.markResetTokenUsed(tokenRecord.id);
    await tokenRepository.revokeAllUserTokens(user.id);
  }

  private async generateTokens(userId: string, email: string, role: 'customer' | 'admin'): Promise<AuthTokens> {
    const payload = { id: userId, email, role };
    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration as unknown as number,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await tokenRepository.saveRefreshToken({
      id: uuidv4(),
      userId,
      token: refreshToken,
      expiresAt,
      isRevoked: false,
      createdAt: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwtExpiration,
    };
  }
}

export const authService = new AuthService();
