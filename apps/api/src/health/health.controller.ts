import { Public } from '@api/common/decorators/public.decorator';
import { PrismaService } from '@api/common/prisma/prisma.service';
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('ready')
  @Public()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'marketplace-api' };
    } catch {
      throw new ServiceUnavailableException('Marketplace database unavailable');
    }
  }

  @Get()
  @Public()
  check() {
    return {
      databaseRuntime: 'postgresql',
      databaseTarget: 'DATABASE_URL',
      status: 'ok',
      service: 'marketplace-api',
      timestamp: new Date().toISOString(),
    };
  }
}
