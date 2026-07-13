export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationStatusInfo {
  status: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
}
