import { Photo } from '../profile/profile.models';

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER_LIKE';

export interface MatchInfo {
  matchId: string;
  userId: string;
  firstName: string;
  photos: Photo[];
  matchedAt: string;
}

export interface SwipeResult {
  targetUserId: string;
  action: SwipeAction;
  isMatch: boolean;
  match: MatchInfo | null;
}

export interface SwipeLimits {
  likesRemaining: number;
  superLikesRemaining: number;
  undosRemaining: number;
  boostsRemaining: number;
}
