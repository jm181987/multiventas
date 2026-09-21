import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multiventas API')
    .setDescription('API marketplace multi-vendedor')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
