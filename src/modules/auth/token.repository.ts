export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export class TokenRepository {
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  private resetTokens: Map<string, PasswordResetRecord> = new Map();

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    this.refreshTokens.set(record.token, record);
  }

  async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(token) || null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const record = this.refreshTokens.get(token);
    if (record) {
      record.isRevoked = true;
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId) {
        record.isRevoked = true;
      }
    }
  }

  async savePasswordResetToken(record: PasswordResetRecord): Promise<void> {
    this.resetTokens.set(record.id, record);
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetRecord | null> {
    for (const record of this.resetTokens.values()) {
      // NOTE: Linear search by token string
      if (record.token === token) {
        return record;
      }
    }
    return null;
  }

  async markResetTokenUsed(id: string): Promise<void> {
    const record = this.resetTokens.get(id);
    if (record) {
      record.used = true;
    }
  }
}

export const tokenRepository = new TokenRepository();
