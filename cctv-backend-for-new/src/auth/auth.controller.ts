import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../decorators/public.decorator';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class RefreshDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('change-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() body: ChangePasswordDto) {
    return this.authService.changePassword(body.token, body.newPassword);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    try {
      return await this.authService.generateNewAccessToken(body.refresh_token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
