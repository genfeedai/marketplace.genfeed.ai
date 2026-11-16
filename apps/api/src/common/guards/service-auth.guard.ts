import { JwtVerifierService } from '@api/common/auth/jwt-verifier.service';
import type { MarketplaceServiceScope } from '@api/common/auth/service-auth.constants';
import { SERVICE_SCOPE_KEY } from '@api/common/decorators/service-scope.decorator';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Guards the routes only the Genfeed API may call. Pair it with `@Public()`
 * (the user guard would refuse a service token) and `@ServiceScope(...)`. A
 * route without a scope refuses everyone.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtVerifierService) private readonly verifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<MarketplaceServiceScope>(
      SERVICE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const match = context
      .switchToHttp()
      .getRequest<Request>()
      .headers.authorization?.match(/^Bearer (\S+)$/i);
    if (!scope || !match) {
      throw new UnauthorizedException('Invalid service token');
    }
    await this.verifier.verifyService(match[1], scope);
    return true;
  }
}
