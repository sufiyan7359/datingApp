import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';

/**
 * Must run after JwtAuthGuard (so request.user is populated). Looks the role
 * up fresh from the DB each time rather than trusting the JWT, so a
 * promotion/demotion takes effect immediately without waiting for the
 * access token to expire.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { role: true, isActive: true },
    });
    if (!user || !user.isActive || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
