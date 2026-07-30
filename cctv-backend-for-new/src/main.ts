import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow up to 100 MB to accommodate large multi-image site submissions
  // (base64-encoded photos sent as JSON). Nginx is set to 200 MB so it never
  // rejects before this limit is reached.
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
