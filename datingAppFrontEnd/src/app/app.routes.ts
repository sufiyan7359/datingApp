import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

// Every route is lazy so the initial bundle is just the app shell (header,
// footer, router) - each screen's code only downloads when it's actually
// visited, instead of every feature (admin panel, chat, premium, etc.)
// shipping up front regardless of which page loads first.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./components/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'service',
    loadComponent: () => import('./components/service/service.component').then((m) => m.ServiceComponent),
  },
  {
    path: 'blog',
    loadComponent: () => import('./components/blog/blog.component').then((m) => m.BlogComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./components/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./components/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./components/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'premium',
    loadComponent: () => import('./components/premium/premium.component').then((m) => m.PremiumComponent),
    canActivate: [authGuard],
  },
  {
    path: 'likes',
    loadComponent: () => import('./components/likes/likes.component').then((m) => m.LikesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'safety',
    loadComponent: () =>
      import('./components/safety-settings/safety-settings.component').then((m) => m.SafetySettingsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'verification',
    loadComponent: () =>
      import('./components/verification/verification.component').then((m) => m.VerificationComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'chating/:id',
    loadComponent: () =>
      import('./components/chating-box/chating-box.component').then((m) => m.ChatingBoxComponent),
    canActivate: [authGuard],
  },
  {
    path: 'chating',
    loadComponent: () =>
      import('./components/chating-box/chating-box.component').then((m) => m.ChatingBoxComponent),
    canActivate: [authGuard],
  },
];
