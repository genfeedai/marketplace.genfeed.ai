import { MarketplaceConfigService } from '@api/config/config.service';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/**
 * Settings shared by the real server and the tests that must see what the
 * server sends: proxy trust, security headers, CORS and request validation.
 */
export function configureApp(app: NestExpressApplication): void {
  const marketplaceConfig = app.get(MarketplaceConfigService);

  // The API runs behind one load balancer hop in production. Trusting exactly
  // one hop makes `request.ip` the real client, which the rate limit keys on.
  // Elsewhere nothing sits in front, so a forwarded header must not be trusted.
  if (marketplaceConfig.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  // The API serves JSON to a web app on another origin, so its responses must
  // stay readable cross-origin (CORS still decides who may call it).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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
}
