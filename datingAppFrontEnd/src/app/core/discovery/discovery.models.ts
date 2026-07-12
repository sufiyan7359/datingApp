import { Gender, LifestyleChoice, Photo, RelationshipGoal } from '../profile/profile.models';

export interface DiscoveryProfile {
  userId: string;
  firstName: string;
  age: number | null;
  gender: Gender | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  profession: string | null;
  education: string | null;
  smoking: LifestyleChoice | null;
  drinking: LifestyleChoice | null;
  workout: LifestyleChoice | null;
  relationshipGoal: RelationshipGoal | null;
  interests: string[];
  photos: Photo[];
  distanceKm: number | null;
}

export interface DiscoveryFeed {
  results: DiscoveryProfile[];
  page: number;
  limit: number;
  total: number;
}

export interface DiscoveryFilters {
  page?: number;
  limit?: number;
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  religion?: string;
  language?: string;
  education?: string;
  profession?: string;
  relationshipGoal?: RelationshipGoal;
  smoking?: LifestyleChoice;
  drinking?: LifestyleChoice;
  workout?: LifestyleChoice;
  hasKids?: boolean;
  wantsKids?: boolean;
  hasPets?: boolean;
  interests?: string;
  maxDistanceKm?: number;
}
