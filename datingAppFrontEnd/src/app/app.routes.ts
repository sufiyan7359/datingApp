import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { guestGuard } from './core/auth/guest.guard';

// Every route is lazy so the initial bundle is just the app shell (header,
// footer, router) - each screen's code only downloads when it's actually
// visited, instead of every feature (admin panel, chat, premium, etc.)
// shipping up front regardless of which page loads first.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then((m) => m.LandingComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    // Not guestGuard-ed on purpose: a logged-in user (e.g. in another tab,
    // or with a stale session) should still be able to reset their password.
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
    canActivate: [guestGuard],
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
    path: 'messages',
    loadComponent: () => import('./components/messages/messages.component').then((m) => m.MessagesComponent),
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
    loadComponent: () =>
      import('./components/admin/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/admin/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./components/admin/admin-user-detail/admin-user-detail.component').then(
            (m) => m.AdminUserDetailComponent,
          ),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./components/admin/admin-support/admin-support.component').then((m) => m.AdminSupportComponent),
      },
      {
        path: 'messages/:userId',
        loadComponent: () =>
          import('./components/admin/admin-support-thread/admin-support-thread.component').then(
            (m) => m.AdminSupportThreadComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./components/admin/admin-reports/admin-reports.component').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'verifications',
        loadComponent: () =>
          import('./components/admin/admin-verifications/admin-verifications.component').then(
            (m) => m.AdminVerificationsComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./components/admin/admin-analytics/admin-analytics.component').then((m) => m.AdminAnalyticsComponent),
      },
      {
        path: 'promo-codes',
        loadComponent: () =>
          import('./components/admin/admin-promo-codes/admin-promo-codes.component').then(
            (m) => m.AdminPromoCodesComponent,
          ),
      },
    ],
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./components/support-chat/support-chat.component').then((m) => m.SupportChatComponent),
    canActivate: [authGuard],
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
