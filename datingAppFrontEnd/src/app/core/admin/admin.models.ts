export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newUsersLast7Days: number;
  totalMatches: number;
  totalMessages: number;
  premiumSubscribers: number;
  activeSubscriptionRevenueCents: number;
  pendingReports: number;
  totalReports: number;
  pendingVerifications: number;
  verifiedUsers: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: 'USER' | 'ADMIN';
  subscriptionTier: 'FREE' | 'GOLD' | 'PLATINUM';
  onboardingCompleted: boolean;
  isVerified: boolean;
  reportsReceivedCount: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  matchesCount: number;
  messagesSentCount: number;
  reportsMadeCount: number;
}

export interface AdminUsersPage {
  results: AdminUserSummary[];
  page: number;
  limit: number;
  total: number;
}

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED';

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterFirstName: string;
  reportedId: string;
  reportedFirstName: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminReportsPage {
  results: AdminReport[];
  page: number;
  limit: number;
  total: number;
}

export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminVerification {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  selfieUrl: string | null;
  primaryPhotoUrl: string | null;
  status: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
}

export interface AdminVerificationsPage {
  results: AdminVerification[];
  page: number;
  limit: number;
  total: number;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  discountPercent: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}
