import { Injectable } from '@nestjs/common';

/**
 * Tracks which users have an active socket connection. In-memory and scoped to
 * this process - fine for a single server instance. If this app is ever
 * horizontally scaled, this needs to move to Redis (already provisioned in
 * Phase 0) so presence is shared across instances.
 */
@Injectable()
export class PresenceService {
  private readonly socketsByUser = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string): boolean {
    const wasOffline = !this.isOnline(userId);
    const sockets = this.socketsByUser.get(userId) ?? new Set();
    sockets.add(socketId);
    this.socketsByUser.set(userId, sockets);
    return wasOffline;
  }

  removeConnection(userId: string, socketId: string): boolean {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId: string): boolean {
    return (this.socketsByUser.get(userId)?.size ?? 0) > 0;
  }
}
