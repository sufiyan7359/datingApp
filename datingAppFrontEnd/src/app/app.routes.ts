import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AboutComponent } from './components/about/about.component';
import { BlogComponent } from './components/blog/blog.component';
import { ContactComponent } from './components/contact/contact.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent } from './components/login/login.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RegisterComponent } from './components/register/register.component';
import { ServiceComponent } from './components/service/service.component';
import { ChatingBoxComponent } from './components/chating-box/chating-box.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { PremiumComponent } from './components/premium/premium.component';
import { LikesComponent } from './components/likes/likes.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'service', component: ServiceComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'about', component: AboutComponent },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'premium', component: PremiumComponent, canActivate: [authGuard] },
  { path: 'likes', component: LikesComponent, canActivate: [authGuard] },
  { path: 'chating/:id', component: ChatingBoxComponent, canActivate: [authGuard] },
  { path: 'chating', component: ChatingBoxComponent, canActivate: [authGuard] },
];
