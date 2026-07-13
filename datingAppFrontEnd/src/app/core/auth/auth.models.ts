export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

export function isTwoFactorChallenge(
  response: AuthResponse | TwoFactorChallenge,
): response is TwoFactorChallenge {
  return (response as TwoFactorChallenge).requiresTwoFactor === true;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
