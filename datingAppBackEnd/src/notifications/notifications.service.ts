import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const subject = this.configService.get<string>('VAPID_SUBJECT');
    const publicKey = this.getPublicKey();
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    if (!subject || !publicKey || !privateKey) {
      this.logger.warn(
        'VAPID_SUBJECT/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not set - push notifications are disabled.',
      );
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  getPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }

  private isConfigured(): boolean {
    return Boolean(
      this.getPublicKey() &&
      this.configService.get<string>('VAPID_PRIVATE_KEY') &&
      this.configService.get<string>('VAPID_SUBJECT'),
    );
  }

  async subscribe(userId: string, dto: PushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  /**
   * Best-effort: never throws, so a flaky push provider or a stale
   * subscription can never break the feature (match/like/message) that
   * triggered it. Subscriptions the push service reports as gone (404/410)
   * are pruned.
   */
  async notify(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subscriptions.length === 0) {
      return;
    }

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (err) {
          const statusCode = (err as webpush.WebPushError).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => undefined);
          } else {
            this.logger.warn(
              `Push notification failed for subscription ${sub.id}: ${(err as Error).message}`,
            );
          }
        }
      }),
    );
  }
}
