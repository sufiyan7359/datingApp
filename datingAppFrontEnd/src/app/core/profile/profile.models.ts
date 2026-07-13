export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';

export type RelationshipGoal = 'LONG_TERM' | 'SHORT_TERM' | 'CASUAL' | 'FRIENDSHIP' | 'NOT_SURE';

export type LifestyleChoice = 'NEVER' | 'SOMETIMES' | 'REGULARLY';

export interface Photo {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
  isBlurred: boolean;
}

export interface Profile {
  gender: Gender | null;
  interestedIn: Gender[];
  dateOfBirth: string | null;
  heightCm: number | null;
  religion: string | null;
  languages: string[];
  profession: string | null;
  education: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  smoking: LifestyleChoice | null;
  drinking: LifestyleChoice | null;
  workout: LifestyleChoice | null;
  relationshipGoal: RelationshipGoal | null;
  hasKids: boolean | null;
  wantsKids: boolean | null;
  hasPets: boolean | null;
  interests: string[];
  onboardingCompleted: boolean;
  isIncognito: boolean;
  passportLatitude: number | null;
  passportLongitude: number | null;
  passportCity: string | null;
  passportCountry: string | null;
  hideAge: boolean;
  hideDistance: boolean;
  hideOnlineStatus: boolean;
  photos: Photo[];
  isVerified: boolean;
}

export type UpdateProfilePayload = Partial<Omit<Profile, 'photos'>> & { clearPassport?: boolean };
