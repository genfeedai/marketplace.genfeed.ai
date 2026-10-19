import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import {
  getIdentity,
  getIsSuperAdmin,
} from '@api/common/auth/marketplace-principal';
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: MarketplacePrincipal }>();
    const user = req.user;

    if (!user) {
      throw new HttpException(
        { detail: 'Token is incorrect', title: 'Roles - Forbidden' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (getIsSuperAdmin(user)) {
      return true;
    }

    throw new HttpException(
      {
        detail: 'Only platform superadmins can access this resource',
        title: 'Roles - Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
