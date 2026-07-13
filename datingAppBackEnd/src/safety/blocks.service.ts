import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockedUserDto } from './dto/blocked-user.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
  }

  async listBlocked(blockerId: string): Promise<BlockedUserDto[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
    });
    const blockedIds = blocks.map((b) => b.blockedId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: blockedIds } },
      select: { id: true, firstName: true },
    });
    const firstNameById = new Map(users.map((u) => [u.id, u.firstName]));

    return blocks.map((b) => ({
      userId: b.blockedId,
      firstName: firstNameById.get(b.blockedId) ?? '',
      blockedAt: b.createdAt,
    }));
  }

  /** True if either user has blocked the other. Used to enforce mutual exclusion everywhere. */
  async isBlockedEitherDirection(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
    });
    return !!block;
  }

  /** All user IDs blocked in either direction relative to userId - handy for excluding from list queries. */
  async blockedEitherDirectionIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const b of blocks) {
      ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
    return [...ids];
  }
}
