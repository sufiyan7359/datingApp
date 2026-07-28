import { Photo } from '../profile/profile.models';

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER_LIKE';

export interface MatchInfo {
  matchId: string;
  userId: string;
  firstName: string;
  photos: Photo[];
  isVerified: boolean;
  matchedAt: string;
}

export interface SwipeResult {
  targetUserId: string;
  action: SwipeAction;
  isMatch: boolean;
  match: MatchInfo | null;
}

export interface SwipeLimits {
  tier: 'FREE' | 'GOLD' | 'PLATINUM';
  likesRemaining: number;
  likesUnlimited: boolean;
  superLikesRemaining: number;
  superLikesUnlimited: boolean;
  undosRemaining: number;
  undosUnlimited: boolean;
  boostsRemaining: number;
}

export interface LikeReceivedItem {
  userId: string;
  firstName: string;
  photos: Photo[];
  isVerified: boolean;
  action: SwipeAction;
  likedAt: string;
}

export interface LikesReceived {
  count: number;
  isPremium: boolean;
  likes: LikeReceivedItem[];
}
