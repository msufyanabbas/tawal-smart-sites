// ==== jwt.service.ts ====

import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-interface';

@Injectable()
export class JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  // Sign a token (access or refresh)
  async signPayload(
    payload: any,
    secret?: any,
    expiresIn?: any,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: secret.secret || process.env.JWT_ACCESS_SECRET, // default to access secret
      expiresIn: secret.expiresIn || '15m',                   // default to 15 min
    });
  }

  // Verify token
  async verifyToken(token: string, secret?: string): Promise<JwtPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: secret || process.env.JWT_ACCESS_SECRET,
    });
  }
}
