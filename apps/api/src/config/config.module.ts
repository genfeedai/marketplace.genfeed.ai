import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketplaceConfigService } from './config.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MarketplaceConfigService],
  exports: [MarketplaceConfigService],
})
export class MarketplaceConfigModule {}
