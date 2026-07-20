import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/profile/profile.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { Gender, LifestyleChoice, Profile, RelationshipGoal } from '../../core/profile/profile.models';
import { environment } from '../../../environments/environment';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

type Tab = 'about' | 'edit' | 'photos' | 'settings';

function minimumAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: unknown } | null => {
    if (!control.value) {
      return null;
    }
    const dob = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= minAge ? null : { tooYoung: true };
  };
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [NgClass, NgIf, NgFor, ReactiveFormsModule, RouterLink, UserAvatarComponent],
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  readonly genders: Gender[] = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'];
  readonly lifestyleOptions: LifestyleChoice[] = ['NEVER', 'SOMETIMES', 'REGULARLY'];
  readonly relationshipGoals: RelationshipGoal[] = ['LONG_TERM', 'SHORT_TERM', 'CASUAL', 'FRIENDSHIP', 'NOT_SURE'];

  readonly apiUrl = environment.apiUrl;
  readonly profile = this.profileService.profile;
  readonly currentUser = this.authService.currentUser;
  readonly isDarkTheme = this.themeService.isDark;

  readonly tab = signal<Tab>('about');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly coverUploadError = signal<string | null>(null);
  readonly isUploadingCover = signal(false);

  form: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.profileService.loadProfile().subscribe({
      next: (profile) => {
        this.isLoading.set(false);
        this.patchForm(profile);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Could not load your profile. Please refresh and try again.');
      },
    });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  age(dateOfBirth: string | null): number | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  private buildForm(): void {
    this.form = new FormGroup({
      gender: new FormControl<Gender | ''>('', Validators.required),
      interestedIn: new FormGroup({
        MALE: new FormControl(false),
        FEMALE: new FormControl(false),
        NON_BINARY: new FormControl(false),
        OTHER: new FormControl(false),
      }),
      dateOfBirth: new FormControl('', [Validators.required, minimumAgeValidator(18)]),
      heightCm: new FormControl('', [Validators.min(100), Validators.max(250)]),

      religion: new FormControl(''),
      languages: new FormControl(''),
      profession: new FormControl(''),
      education: new FormControl(''),
      city: new FormControl(''),
      country: new FormControl(''),

      bio: new FormControl('', Validators.maxLength(500)),
      interests: new FormControl(''),

      smoking: new FormControl<LifestyleChoice | ''>(''),
      drinking: new FormControl<LifestyleChoice | ''>(''),
      workout: new FormControl<LifestyleChoice | ''>(''),
      relationshipGoal: new FormControl<RelationshipGoal | ''>(''),
      hasKids: new FormControl(''),
      wantsKids: new FormControl(''),
      hasPets: new FormControl(''),
    });
  }

  private patchForm(profile: Profile): void {
    this.form.patchValue({
      gender: profile.gender ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.substring(0, 10) : '',
      heightCm: profile.heightCm ?? '',
      religion: profile.religion ?? '',
      languages: (profile.languages ?? []).join(', '),
      profession: profile.profession ?? '',
      education: profile.education ?? '',
      city: profile.city ?? '',
      country: profile.country ?? '',
      bio: profile.bio ?? '',
      interests: (profile.interests ?? []).join(', '),
      smoking: profile.smoking ?? '',
      drinking: profile.drinking ?? '',
      workout: profile.workout ?? '',
      relationshipGoal: profile.relationshipGoal ?? '',
      hasKids: profile.hasKids === null ? '' : String(profile.hasKids),
      wantsKids: profile.wantsKids === null ? '' : String(profile.wantsKids),
      hasPets: profile.hasPets === null ? '' : String(profile.hasPets),
    });

    const interestedInGroup = this.form.get('interestedIn') as FormGroup;
    for (const g of this.genders) {
      interestedInGroup.get(g)?.setValue(profile.interestedIn.includes(g));
    }
  }

  saveProfile(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const interestedIn = Object.entries(value.interestedIn as Record<Gender, boolean>)
      .filter(([, checked]) => checked)
      .map(([gender]) => gender as Gender);

    const toArray = (raw: string): string[] =>
      raw
        .split(',')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);

    const toBooleanOrNull = (raw: string): boolean | undefined => (raw === '' ? undefined : raw === 'true');

    this.isSubmitting.set(true);
    this.profileService
      .updateProfile({
        gender: value.gender || undefined,
        interestedIn,
        dateOfBirth: value.dateOfBirth,
        heightCm: value.heightCm ? Number(value.heightCm) : undefined,
        religion: value.religion || undefined,
        languages: toArray(value.languages),
        profession: value.profession || undefined,
        education: value.education || undefined,
        city: value.city || undefined,
        country: value.country || undefined,
        bio: value.bio || undefined,
        interests: toArray(value.interests),
        smoking: value.smoking || undefined,
        drinking: value.drinking || undefined,
        workout: value.workout || undefined,
        relationshipGoal: value.relationshipGoal || undefined,
        hasKids: toBooleanOrNull(value.hasKids),
        wantsKids: toBooleanOrNull(value.wantsKids),
        hasPets: toBooleanOrNull(value.hasPets),
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Profile updated.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        },
      });
  }

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.coverUploadError.set(null);
    this.isUploadingCover.set(true);
    this.profileService.uploadCoverPhoto(file).subscribe({
      next: () => {
        this.isUploadingCover.set(false);
        input.value = '';
      },
      error: (err) => {
        this.isUploadingCover.set(false);
        this.coverUploadError.set(err?.error?.message ?? 'Could not upload that cover photo.');
        input.value = '';
      },
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set(null);
    this.profileService.uploadPhoto(file).subscribe({
      next: () => {
        input.value = '';
      },
      error: (err) => {
        this.uploadError.set(err?.error?.message ?? 'Could not upload that photo.');
        input.value = '';
      },
    });
  }

  removePhoto(photoId: string): void {
    this.profileService.deletePhoto(photoId).subscribe();
  }

  makePrimary(photoId: string): void {
    this.uploadError.set(null);
    this.profileService.setPrimaryPhoto(photoId).subscribe({
      error: (err) => this.uploadError.set(err?.error?.message ?? 'Could not set that as your profile picture.'),
    });
  }

  togglePhotoBlur(photoId: string, currentlyBlurred: boolean): void {
    this.profileService.setPhotoBlur(photoId, !currentlyBlurred).subscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
