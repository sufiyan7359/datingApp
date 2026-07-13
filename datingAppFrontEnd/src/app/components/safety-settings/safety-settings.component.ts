import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafetyService } from '../../core/safety/safety.service';
import { ProfileService } from '../../core/profile/profile.service';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-safety-settings',
  templateUrl: './safety-settings.component.html',
  styleUrls: ['./safety-settings.component.css'],
  imports: [NgFor, NgIf, FormsModule],
})
export class SafetySettingsComponent implements OnInit {
  private readonly safetyService = inject(SafetyService);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  readonly apiUrl = environment.apiUrl;
  readonly blockedUsers = this.safetyService.blockedUsers;
  readonly profile = this.profileService.profile;
  readonly currentUser = this.authService.currentUser;
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly twoFactorSetup = signal<{ otpauthUrl: string; qrCodeDataUrl: string } | null>(null);
  twoFactorCode = '';
  disablePassword = '';
  readonly twoFactorBusy = signal(false);

  ngOnInit(): void {
    this.safetyService.loadBlocked().subscribe();
    this.profileService.loadProfile().subscribe();
  }

  unblock(userId: string): void {
    this.safetyService.unblock(userId).subscribe({
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not unblock this user.'),
    });
  }

  togglePrivacy(field: 'hideAge' | 'hideDistance' | 'hideOnlineStatus'): void {
    const profile = this.profile();
    if (!profile) return;
    this.profileService.updateProfile({ [field]: !profile[field] }).subscribe({
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not update that setting.'),
    });
  }

  togglePhotoBlur(photoId: string, currentlyBlurred: boolean): void {
    this.profileService.setPhotoBlur(photoId, !currentlyBlurred).subscribe({
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not update that photo.'),
    });
  }

  startTwoFactorSetup(): void {
    this.errorMessage.set(null);
    this.authService.setupTwoFactor().subscribe({
      next: (setup) => this.twoFactorSetup.set(setup),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Could not start 2FA setup.'),
    });
  }

  confirmTwoFactor(): void {
    if (!this.twoFactorCode.trim()) return;
    this.errorMessage.set(null);
    this.twoFactorBusy.set(true);
    this.authService.confirmTwoFactor(this.twoFactorCode.trim()).subscribe({
      next: () => {
        this.twoFactorBusy.set(false);
        this.twoFactorSetup.set(null);
        this.twoFactorCode = '';
        this.successMessage.set('Two-factor authentication is now enabled.');
      },
      error: (err) => {
        this.twoFactorBusy.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Invalid code.');
      },
    });
  }

  cancelTwoFactorSetup(): void {
    this.twoFactorSetup.set(null);
    this.twoFactorCode = '';
  }

  disableTwoFactor(): void {
    if (!this.disablePassword.trim()) return;
    this.errorMessage.set(null);
    this.twoFactorBusy.set(true);
    this.authService.disableTwoFactor(this.disablePassword.trim()).subscribe({
      next: () => {
        this.twoFactorBusy.set(false);
        this.disablePassword = '';
        this.successMessage.set('Two-factor authentication has been disabled.');
      },
      error: (err) => {
        this.twoFactorBusy.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Incorrect password.');
      },
    });
  }
}
