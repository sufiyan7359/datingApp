import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionsService } from '../../core/subscriptions/subscriptions.service';
import { Plan, PromoValidation } from '../../core/subscriptions/subscriptions.models';
import { ProfileService } from '../../core/profile/profile.service';

@Component({
  selector: 'app-premium',
  templateUrl: './premium.component.html',
  styleUrls: ['./premium.component.css'],
  imports: [NgFor, NgIf, DatePipe, TitleCasePipe, FormsModule],
})
export class PremiumComponent implements OnInit {
  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly profileService = inject(ProfileService);

  readonly tiers: readonly Plan['tier'][] = ['GOLD', 'PLATINUM'];
  readonly plans = signal<Plan[]>([]);
  readonly status = this.subscriptionsService.status;
  readonly profile = this.profileService.profile;
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly promoResult = signal<PromoValidation | null>(null);

  promoCode = '';
  passportLatitude: number | null = null;
  passportLongitude: number | null = null;
  passportCity = '';
  passportCountry = '';

  ngOnInit(): void {
    this.subscriptionsService.loadPlans().subscribe((plans) => this.plans.set(plans));
    this.subscriptionsService.loadStatus().subscribe();
    this.profileService.loadProfile().subscribe((profile) => {
      this.passportLatitude = profile.passportLatitude;
      this.passportLongitude = profile.passportLongitude;
      this.passportCity = profile.passportCity ?? '';
      this.passportCountry = profile.passportCountry ?? '';
    });
  }

  plansFor(tier: 'GOLD' | 'PLATINUM'): Plan[] {
    return this.plans().filter((p) => p.tier === tier);
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  checkPromo(): void {
    if (!this.promoCode.trim()) {
      this.promoResult.set(null);
      return;
    }
    this.subscriptionsService.validatePromo(this.promoCode.trim()).subscribe((result) => this.promoResult.set(result));
  }

  subscribe(plan: Plan): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    this.subscriptionsService.subscribe(plan.tier, plan.billingCycle, this.promoCode.trim() || undefined).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`You're now on ${plan.tier}. Enjoy the perks!`);
        this.promoCode = '';
        this.promoResult.set(null);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not activate that plan.');
      },
    });
  }

  cancelAutoRenew(): void {
    this.subscriptionsService.cancelAutoRenew().subscribe({
      next: () => this.successMessage.set('Auto-renew turned off. Your plan stays active until it expires.'),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not update auto-renew.'),
    });
  }

  get isPremium(): boolean {
    return this.status()?.isPremium ?? false;
  }

  toggleIncognito(): void {
    const profile = this.profile();
    if (!profile) return;
    this.errorMessage.set(null);
    this.profileService.updateProfile({ isIncognito: !profile.isIncognito }).subscribe({
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not update incognito mode.'),
    });
  }

  setPassport(): void {
    if (this.passportLatitude === null || this.passportLongitude === null) {
      this.errorMessage.set('Enter both a latitude and longitude for Passport mode.');
      return;
    }
    this.errorMessage.set(null);
    this.profileService
      .updateProfile({
        passportLatitude: this.passportLatitude,
        passportLongitude: this.passportLongitude,
        passportCity: this.passportCity || undefined,
        passportCountry: this.passportCountry || undefined,
      })
      .subscribe({
        next: () => this.successMessage.set('Passport location updated. Your discovery feed will now browse from there.'),
        error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not update Passport location.'),
      });
  }

  clearPassport(): void {
    this.profileService.updateProfile({ clearPassport: true }).subscribe({
      next: () => {
        this.passportLatitude = null;
        this.passportLongitude = null;
        this.passportCity = '';
        this.passportCountry = '';
        this.successMessage.set('Passport mode turned off.');
      },
    });
  }
}
