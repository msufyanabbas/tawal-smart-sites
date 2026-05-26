import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../jwt/jwt.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { TokenService } from '../token/token.service';
import { Role } from '../user/role.enum';
import { normalizeRole } from '../user/role.util';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private tokenService: TokenService,
  ) {}

  // Seed a default admin on first boot so the platform is usable out of the box.
  // Reads ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD from env; skips if
  // either is missing or if an admin already exists.
  async onModuleInit() {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!email || !password) return;

    const anyAdmin = await this.userService.countByRole(Role.ADMIN);
    if (anyAdmin > 0) return;

    const existing = await this.userService.findByEmail(email);
    if (existing) return;

    const hashed = await bcrypt.hash(password, 10);
    await this.userService.createRaw({
      name: 'Administrator',
      email,
      password: hashed,
      role: Role.ADMIN,
      isApproved: true,
    });
    this.logger.log(`Bootstrapped admin user ${email}`);
  }

  async validateUser(payload: { email: string; password?: string }) {
    const user: any = await this.userService.findByEmail(payload.email);
    if (!user) throw new NotFoundException('User not found');

    if (payload.password) {
      const ok = await bcrypt.compare(payload.password, user.password);
      if (!ok) throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isApproved) {
      throw new UnauthorizedException('Account not approved yet');
    }
    return user;
  }

  async login(body: { email: string; password: string }) {
    const validatedUser = await this.validateUser({
      email: body.email,
      password: body.password,
    });

    const role = normalizeRole(validatedUser.role);
    const jwtPayload = {
      email: validatedUser.email,
      userId: validatedUser._id,
      role,
    };

    const accessToken = await this.jwtService.signPayload(jwtPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signPayload(jwtPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: validatedUser._id,
        name: validatedUser.name ?? '',
        email: validatedUser.email,
        role,
      },
    };
  }

  async generateNewAccessToken(refreshToken: string) {
    try {
      const decoded: any = await this.jwtService.verifyToken(
        refreshToken,
        process.env.JWT_REFRESH_SECRET,
      );
      const newPayload = {
        email: decoded.email,
        userId: decoded.userId,
        role: normalizeRole(decoded.role),
      };
      const newAccessToken = await this.jwtService.signPayload(newPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      });
      return { access_token: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async requestPasswordReset(email: string) {
    // Always return the same shape so we don't leak which emails exist.
    const user: any = await this.userService.findByEmail(email);
    if (!user || !user.isApproved) {
      return { message: 'If that account exists, a reset link has been sent.' };
    }
    const resetToken = await this.tokenService.saveResetToken(user._id);
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    return { message: 'If that account exists, a reset link has been sent.' };
  }

  async changePassword(token: string, newPassword: string) {
    const tokenData = await this.tokenService.findTokenData(token);
    const user = await this.userService.findById(tokenData.userId.toString());
    if (!user) throw new UnauthorizedException('User not found');

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await this.tokenService.invalidateToken(token);
    return { message: 'Password successfully changed' };
  }
}
