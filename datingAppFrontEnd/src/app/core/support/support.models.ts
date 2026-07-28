export type SupportThreadStatus = 'OPEN' | 'CLOSED';

export interface SupportMessage {
  id: string;
  threadId: string;
  senderId: string;
  isFromAdmin: boolean;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface SupportThread {
  threadId: string;
  status: SupportThreadStatus;
  unreadCount: number;
  messages: SupportMessage[];
}
