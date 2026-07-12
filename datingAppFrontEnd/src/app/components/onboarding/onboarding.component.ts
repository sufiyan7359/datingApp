import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileService } from '../../core/profile/profile.service';
import { Gender, LifestyleChoice, RelationshipGoal } from '../../core/profile/profile.models';
import { environment } from '../../../environments/environment';

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
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
  imports: [ReactiveFormsModule, NgIf, NgFor],
})
export class OnboardingComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly genders: Gender[] = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'];
  readonly lifestyleOptions: LifestyleChoice[] = ['NEVER', 'SOMETIMES', 'REGULARLY'];
  readonly relationshipGoals: RelationshipGoal[] = ['LONG_TERM', 'SHORT_TERM', 'CASUAL', 'FRIENDSHIP', 'NOT_SURE'];

  readonly step = signal(1);
  readonly totalSteps = 5;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly profile = this.profileService.profile;
  readonly apiUrl = environment.apiUrl;
  readonly locationStatus = signal<'idle' | 'locating' | 'done' | 'error'>('idle');

  form: FormGroup;

  ngOnInit(): void {
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
      latitude: new FormControl<number | null>(null),
      longitude: new FormControl<number | null>(null),

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

    this.profileService.loadProfile().subscribe({
      error: () => this.errorMessage.set('Could not load your profile. Please refresh and try again.'),
    });
  }

  private readonly stepFieldNames: Record<number, string[]> = {
    1: ['gender', 'dateOfBirth', 'heightCm'],
  };

  goNext(): void {
    const fieldsToCheck = this.stepFieldNames[this.step()];
    if (fieldsToCheck) {
      let valid = true;
      for (const name of fieldsToCheck) {
        const control = this.form.get(name);
        control?.markAsTouched();
        if (control?.invalid) {
          valid = false;
        }
      }
      if (!valid) {
        return;
      }
    }
    this.step.set(Math.min(this.step() + 1, this.totalSteps));
  }

  goBack(): void {
    this.step.set(Math.max(this.step() - 1, 1));
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationStatus.set('error');
      return;
    }
    this.locationStatus.set('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.form.patchValue({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        this.locationStatus.set('done');
      },
      () => this.locationStatus.set('error'),
      { timeout: 10000 },
    );
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
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

  finish(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.step.set(1);
      return;
    }

    const value = this.form.value;
    const interestedIn = Object.entries(value.interestedIn as Record<Gender, boolean>)
      .filter(([, checked]) => checked)
      .map(([gender]) => gender as Gender);

    const toArray = (raw: string): string[] =>
      raw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

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
        latitude: value.latitude ?? undefined,
        longitude: value.longitude ?? undefined,
        bio: value.bio || undefined,
        interests: toArray(value.interests),
        smoking: value.smoking || undefined,
        drinking: value.drinking || undefined,
        workout: value.workout || undefined,
        relationshipGoal: value.relationshipGoal || undefined,
        hasKids: toBooleanOrNull(value.hasKids),
        wantsKids: toBooleanOrNull(value.wantsKids),
        hasPets: toBooleanOrNull(value.hasPets),
        onboardingCompleted: true,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        },
      });
  }
}
