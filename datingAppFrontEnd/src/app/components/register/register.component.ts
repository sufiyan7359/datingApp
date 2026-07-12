import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, NgIf],
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  SignupForm: FormGroup;
  showconPassword = false;
  showPassword = false;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  nameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const nameRegex = /^[A-Za-z]{4,}$/;
      const valid = nameRegex.test(control.value);
      return valid ? null : { invalidName: { value: control.value } };
    };
  }

  lastNameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const nameRegex = /^[A-Za-z]{4,}$/;
      const valid = nameRegex.test(control.value);
      return valid ? null : { invalidlastName: { value: control.value } };
    };
  }

  numberValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const numberRegex = /^\d+$/;
      const valid = numberRegex.test(control.value);
      return valid ? null : { invalidNumber: { value: control.value } };
    };
  }

  // Mirrors the backend's password rule (register.dto.ts): at least one lowercase, one
  // uppercase, and one digit. Length is enforced separately via Validators.minLength/maxLength
  // so both the frontend and backend accept exactly the same passwords.
  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      const valid = passwordRegex.test(control.value);
      return valid ? null : { invalidPassword: { value: control.value } };
    };
  }

  ngOnInit(): void {
    this.SignupForm = new FormGroup(
      {
        firstName: new FormControl('', [Validators.required, this.nameValidator()]),
        lastName: new FormControl('', [Validators.required, this.lastNameValidator()]),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          this.passwordValidator(),
        ]),
        number: new FormControl('', [Validators.required, this.numberValidator()]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      {
        validators: this.mustMatch('password', 'confirmPassword'),
      },
    );
  }

  signupData(): void {
    this.errorMessage.set(null);

    if (this.SignupForm.invalid) {
      this.SignupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    // The "number" (phone) field isn't part of the backend's User model yet -
    // phone login/verification is deferred until an SMS provider is wired up.
    const { email, password, firstName, lastName } = this.SignupForm.value;

    this.authService.register({ email, password, firstName, lastName }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigateByUrl('/onboarding');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  mustMatch(password: string, conpassword: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const formGroup = control as FormGroup;
      const passwordControl = formGroup.controls[password];
      const conpasswordControl = formGroup.controls[conpassword];
      if (conpasswordControl.errors && !conpasswordControl.errors['mustMatch']) {
        return null;
      }
      if (passwordControl.value !== conpasswordControl.value) {
        conpasswordControl.setErrors({ mustMatch: true });
      } else {
        conpasswordControl.setErrors(null);
      }
      return null;
    };
  }

  togglePasswordVisibility(e: string): void {
    if (e === 'confirmPassword') {
      this.showconPassword = !this.showconPassword;
    } else {
      this.showPassword = !this.showPassword;
    }
  }
}
