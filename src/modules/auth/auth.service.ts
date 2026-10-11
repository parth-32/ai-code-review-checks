import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../users/user.repository.js';
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

    const tokens = this.generateTokens(user.id, user.email, user.role);
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

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  private generateTokens(userId: string, email: string, role: 'customer' | 'admin'): AuthTokens {
    const payload = { id: userId, email, role };
    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration as unknown as number,
    });

    return {
      accessToken,
      expiresIn: config.jwtExpiration,
    };
  }
}

export const authService = new AuthService();
