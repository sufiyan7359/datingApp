import { Photo } from '../profile/profile.models';

export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE';

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  isPinned: boolean;
  deliveredAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  reactions: Reaction[];
}

export interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherFirstName: string;
  otherPhotos: Photo[];
  otherIsVerified: boolean;
  otherIsOnline: boolean;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  isMuted: boolean;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
}

export interface MessagesReadEvent {
  conversationId: string;
  readerId: string;
  messageIds: string[];
}

export interface MessageDeletedEvent {
  messageId: string;
  conversationId: string;
}

export interface MessageReactionEvent {
  messageId: string;
  userId: string;
  emoji: string;
  added: boolean;
}
