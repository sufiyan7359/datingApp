import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isTwoFactorChallenge } from '../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ReactiveFormsModule, FormsModule, NgIf, RouterLink],
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginForm: FormGroup;
  showPassword = false;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  readonly twoFactorChallengeToken = signal<string | null>(null);
  twoFactorCode = '';

  ngOnInit(): void {
    this.loginForm = new FormGroup({
      loginEmail: new FormControl('', [Validators.required, Validators.email]),
      loginPassword: new FormControl('', [Validators.required]),
    });
  }

  loginData(): void {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.authService
      .login({
        email: this.loginForm.value.loginEmail,
        password: this.loginForm.value.loginPassword,
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (isTwoFactorChallenge(res)) {
            this.twoFactorChallengeToken.set(res.challengeToken);
            return;
          }
          this.navigateAfterLogin();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        },
      });
  }

  submitTwoFactorCode(): void {
    const challengeToken = this.twoFactorChallengeToken();
    if (!challengeToken || !this.twoFactorCode.trim()) return;

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    this.authService.verifyTwoFactorLogin(challengeToken, this.twoFactorCode.trim()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Invalid code. Please try again.');
      },
    });
  }

  cancelTwoFactor(): void {
    this.twoFactorChallengeToken.set(null);
    this.twoFactorCode = '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    void this.router.navigateByUrl(returnUrl);
  }
}
