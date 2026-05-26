import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { JwtService } from '../jwt/jwt.service';
import { JwtStrategy } from '../jwt/jwt.strategy';
import { UserModule } from '../user/user.module';
import { MailService } from '../mail/mail.service';
import { TokenModule } from '../token/token.module';
import { TokenService } from '../token/token.service';
import { Token, TokenSchema } from '../token/token.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule, TokenModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    UserModule,
  ],
  providers: [AuthService, JwtStrategy, MailService, JwtService, TokenService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
