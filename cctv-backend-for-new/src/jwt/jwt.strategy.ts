import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { normalizeRole } from '../user/role.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    if (!payload?.userId || !payload?.email) {
      throw new UnauthorizedException();
    }
    return {
      userId: String(payload.userId),
      email: payload.email,
      role: normalizeRole(payload.role),
    };
  }
}
