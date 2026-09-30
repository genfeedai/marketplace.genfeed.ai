import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { MarketplaceConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();

  const marketplaceConfig = app.get(MarketplaceConfigService);
  const origins = [new URL(marketplaceConfig.marketplaceUrl).origin];
  if (marketplaceConfig.nodeEnv === 'development') {
    origins.push('http://localhost:3205', 'http://127.0.0.1:3205');
  }

  app.enableCors({
    credentials: true,
    origin: origins,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Marketplace API')
    .setDescription('Genfeed.ai Marketplace API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3200;
  await app.listen(port);
}

bootstrap();
