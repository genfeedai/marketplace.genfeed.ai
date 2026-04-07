import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceConfigService } from './config/config.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace',
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [MarketplaceConfigService],
  exports: [MarketplaceConfigService],
})
export class AppModule {}
