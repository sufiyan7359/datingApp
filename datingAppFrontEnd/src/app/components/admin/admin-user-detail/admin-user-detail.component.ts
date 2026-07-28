import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../core/admin/admin.service';
import { AdminUserDetail, RiskAssessment } from '../../../core/admin/admin.models';
import { Gender, LifestyleChoice, Profile, RelationshipGoal } from '../../../core/profile/profile.models';
import { environment } from '../../../../environments/environment';

interface EditForm {
  gender: Gender | '';
  interestedIn: Record<Gender, boolean>;
  dateOfBirth: string;
  heightCm: number | null;
  religion: string;
  languages: string;
  profession: string;
  education: string;
  bio: string;
  city: string;
  country: string;
  smoking: LifestyleChoice | '';
  drinking: LifestyleChoice | '';
  workout: LifestyleChoice | '';
  relationshipGoal: RelationshipGoal | '';
  hasKids: string;
  wantsKids: string;
  hasPets: string;
  interests: string;
}

@Component({
  selector: 'app-admin-user-detail',
  templateUrl: './admin-user-detail.component.html',
  styleUrls: ['../admin-shared.css', './admin-user-detail.component.css'],
  imports: [NgFor, NgIf, FormsModule, RouterLink],
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  readonly apiUrl = environment.apiUrl;
  readonly genders: Gender[] = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'];
  readonly lifestyleOptions: LifestyleChoice[] = ['NEVER', 'SOMETIMES', 'REGULARLY'];
  readonly relationshipGoals: RelationshipGoal[] = ['LONG_TERM', 'SHORT_TERM', 'CASUAL', 'FRIENDSHIP', 'NOT_SURE'];

  readonly userId = signal('');
  readonly userDetail = signal<AdminUserDetail | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly riskAssessment = signal<RiskAssessment | null>(null);
  readonly riskLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly isLoading = signal(true);

  form: EditForm = this.emptyForm();

  private emptyForm(): EditForm {
    return {
      gender: '',
      interestedIn: { MALE: false, FEMALE: false, NON_BINARY: false, OTHER: false },
      dateOfBirth: '',
      heightCm: null,
      religion: '',
      languages: '',
      profession: '',
      education: '',
      bio: '',
      city: '',
      country: '',
      smoking: '',
      drinking: '',
      workout: '',
      relationshipGoal: '',
      hasKids: '',
      wantsKids: '',
      hasPets: '',
      interests: '',
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/users']);
      return;
    }
    this.userId.set(id);
    this.loadAll(id);
  }

  private loadAll(id: string): void {
    this.adminService.getUserDetail(id).subscribe({
      next: (detail) => this.userDetail.set(detail),
      error: (err) => this.handleError(err),
    });
    this.isLoading.set(true);
    this.adminService.getUserProfile(id).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.patchForm(profile);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleError(err);
      },
    });
  }

  private patchForm(profile: Profile): void {
    this.form = {
      gender: profile.gender ?? '',
      interestedIn: {
        MALE: profile.interestedIn.includes('MALE'),
        FEMALE: profile.interestedIn.includes('FEMALE'),
        NON_BINARY: profile.interestedIn.includes('NON_BINARY'),
        OTHER: profile.interestedIn.includes('OTHER'),
      },
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.substring(0, 10) : '',
      heightCm: profile.heightCm,
      religion: profile.religion ?? '',
      languages: (profile.languages ?? []).join(', '),
      profession: profile.profession ?? '',
      education: profile.education ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      country: profile.country ?? '',
      smoking: profile.smoking ?? '',
      drinking: profile.drinking ?? '',
      workout: profile.workout ?? '',
      relationshipGoal: profile.relationshipGoal ?? '',
      hasKids: profile.hasKids === null ? '' : String(profile.hasKids),
      wantsKids: profile.wantsKids === null ? '' : String(profile.wantsKids),
      hasPets: profile.hasPets === null ? '' : String(profile.hasPets),
      interests: (profile.interests ?? []).join(', '),
    };
  }

  private handleError(err: { error?: { message?: string } }): void {
    this.errorMessage.set(err?.error?.message ?? 'Something went wrong.');
  }

  saveProfile(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const toArray = (raw: string): string[] =>
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const toBoolOrUndefined = (raw: string): boolean | undefined => (raw === '' ? undefined : raw === 'true');
    const interestedIn = (Object.entries(this.form.interestedIn) as [Gender, boolean][])
      .filter(([, checked]) => checked)
      .map(([g]) => g);

    this.isSaving.set(true);
    this.adminService
      .updateUserProfile(this.userId(), {
        gender: this.form.gender || undefined,
        interestedIn,
        dateOfBirth: this.form.dateOfBirth || undefined,
        heightCm: this.form.heightCm ?? undefined,
        religion: this.form.religion || undefined,
        languages: toArray(this.form.languages),
        profession: this.form.profession || undefined,
        education: this.form.education || undefined,
        bio: this.form.bio || undefined,
        city: this.form.city || undefined,
        country: this.form.country || undefined,
        smoking: this.form.smoking || undefined,
        drinking: this.form.drinking || undefined,
        workout: this.form.workout || undefined,
        relationshipGoal: this.form.relationshipGoal || undefined,
        hasKids: toBoolOrUndefined(this.form.hasKids),
        wantsKids: toBoolOrUndefined(this.form.wantsKids),
        hasPets: toBoolOrUndefined(this.form.hasPets),
        interests: toArray(this.form.interests),
      })
      .subscribe({
        next: (profile) => {
          this.isSaving.set(false);
          this.profile.set(profile);
          this.successMessage.set('Profile updated.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.handleError(err);
        },
      });
  }

  deletePhoto(photoId: string): void {
    if (!confirm('Remove this photo?')) return;
    this.adminService.deleteUserPhoto(this.userId(), photoId).subscribe({
      next: () => {
        const profile = this.profile();
        if (profile) {
          this.profile.set({ ...profile, photos: profile.photos.filter((p) => p.id !== photoId) });
        }
      },
      error: (err) => this.handleError(err),
    });
  }

  revokeVerification(): void {
    const note = prompt("Reason for revoking this user's verified badge (shown to them):");
    if (note === null) return;
    if (!note.trim()) {
      this.errorMessage.set('A note explaining the revocation is required.');
      return;
    }
    this.adminService.reviewVerification(this.userId(), 'REJECTED', note.trim()).subscribe({
      next: () => {
        this.successMessage.set('Verified badge revoked.');
        this.loadAll(this.userId());
      },
      error: (err) => this.handleError(err),
    });
  }

  checkFakeProfileRisk(): void {
    this.riskLoading.set(true);
    this.adminService.getRiskAssessment(this.userId()).subscribe({
      next: (assessment) => {
        this.riskLoading.set(false);
        this.riskAssessment.set(assessment);
      },
      error: (err) => {
        this.riskLoading.set(false);
        this.handleError(err);
      },
    });
  }

  suspendUser(): void {
    if (!confirm('Suspend this account? They will be logged out and unable to log back in.')) return;
    this.adminService.suspendUser(this.userId()).subscribe({
      next: () => this.loadAll(this.userId()),
      error: (err) => this.handleError(err),
    });
  }

  reactivateUser(): void {
    this.adminService.reactivateUser(this.userId()).subscribe({
      next: () => this.loadAll(this.userId()),
      error: (err) => this.handleError(err),
    });
  }

  messageUser(): void {
    this.router.navigate(['/admin/messages', this.userId()]);
  }
}
