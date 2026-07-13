import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  imports: [NgIf, FormsModule, RouterLink],
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  email = '';
  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);

  submit(): void {
    if (!this.email.trim()) return;
    this.isSubmitting.set(true);
    this.authService.forgotPassword(this.email.trim()).subscribe({
      // Always show the same message, whether or not the email is registered.
      next: () => {
        this.isSubmitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitted.set(true);
      },
    });
  }
}
