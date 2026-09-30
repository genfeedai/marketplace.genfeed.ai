import { Public } from '@api/common/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
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
