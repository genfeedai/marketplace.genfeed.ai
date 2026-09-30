import { JwtVerifierService } from '@api/common/auth/jwt-verifier.service';
import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import { IS_PUBLIC_KEY } from '@api/common/decorators/public.decorator';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtVerifierService) private readonly verifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: MarketplacePrincipal }>();
    const match = request.headers.authorization?.match(/^Bearer (\S+)$/i);
    if (!match) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }
    request.user = await this.verifier.verify(match[1]);
    return true;
  }
}
