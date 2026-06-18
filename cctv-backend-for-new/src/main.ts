// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
dotenv.config();


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set limit to 10mb to accommodate base64-encoded image payloads from clients.
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS so the React web client can hit the API from a browser origin.
  // CORS_ORIGINS is a comma-separated list; falls back to "*" in dev.
  const allowed = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowed.length === 1 && allowed[0] === '*' ? true : allowed,
    credentials: true,
  });

  // Activate the class-validator decorators declared on DTOs.
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  await app.listen(3000);
}
bootstrap();
