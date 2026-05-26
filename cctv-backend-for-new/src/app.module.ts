// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteModule } from './site/site.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { RolesModule } from './roles/roles.module';
import { JwtModule } from '@nestjs/jwt';
import { TokenModule } from './token/token.module';
import { RolesGuard } from './roles/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { ReportsModule } from './reports/reports.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
   imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env variables available app-wide
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as any),
    SiteModule,
    UserModule,
    AuthModule,
    MailModule,
    RolesModule,
    JwtModule,
    TokenModule,
    ReportsModule,
  ]
})
export class AppModule {}
