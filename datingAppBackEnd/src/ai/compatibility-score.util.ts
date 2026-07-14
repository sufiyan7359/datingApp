import { LifestyleChoice, Profile } from '@prisma/client';

// Weights sum to 100 so the result reads as a "% compatible" - not ML, just
// a deterministic point system over shared interests/goals/lifestyle. Ties
// at 0 (e.g. neither profile has set any of these fields) fall through to
// whatever the caller sorts by next.
const POINTS_PER_SHARED_INTEREST = 8;
const MAX_INTEREST_POINTS = 40;
const RELATIONSHIP_GOAL_MATCH_POINTS = 25;
const LIFESTYLE_MATCH_POINTS = 12; // smoking, drinking, workout - up to 3 x 12 = 36, capped below

type CompatibilityProfile = Pick<
  Profile,
  'interests' | 'relationshipGoal' | 'smoking' | 'drinking' | 'workout'
>;

export function computeCompatibilityScore(
  viewer: CompatibilityProfile | null | undefined,
  candidate: CompatibilityProfile,
): number {
  if (!viewer) return 0;

  let score = 0;

  const sharedInterests = viewer.interests.filter((i) =>
    candidate.interests.includes(i),
  ).length;
  score += Math.min(
    MAX_INTEREST_POINTS,
    sharedInterests * POINTS_PER_SHARED_INTEREST,
  );

  if (
    viewer.relationshipGoal &&
    viewer.relationshipGoal === candidate.relationshipGoal
  ) {
    score += RELATIONSHIP_GOAL_MATCH_POINTS;
  }

  score += lifestyleMatchPoints(viewer.smoking, candidate.smoking);
  score += lifestyleMatchPoints(viewer.drinking, candidate.drinking);
  score += lifestyleMatchPoints(viewer.workout, candidate.workout);

  return Math.min(100, score);
}

function lifestyleMatchPoints(
  a: LifestyleChoice | null,
  b: LifestyleChoice | null,
): number {
  return a && a === b ? LIFESTYLE_MATCH_POINTS : 0;
}
