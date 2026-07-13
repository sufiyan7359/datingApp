export type ReportReason =
  | 'INAPPROPRIATE_PHOTOS'
  | 'HARASSMENT'
  | 'FAKE_PROFILE'
  | 'SPAM'
  | 'UNDERAGE'
  | 'OFFLINE_BEHAVIOR'
  | 'OTHER';

export interface BlockedUser {
  userId: string;
  firstName: string;
  blockedAt: string;
}
