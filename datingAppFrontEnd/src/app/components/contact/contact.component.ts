import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [ReactiveFormsModule, NgIf],
})
export class ContactComponent implements OnInit {
  private readonly http = inject(HttpClient);

  contactForm: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  submitted = signal(false);

  ngOnInit(): void {
    this.contactForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      subject: new FormControl('', [Validators.required, Validators.maxLength(150)]),
      message: new FormControl('', [Validators.required, Validators.maxLength(2000)]),
    });
  }

  submit(): void {
    this.errorMessage.set(null);

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.http.post<void>(`${environment.apiUrl}/contact`, this.contactForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitted.set(true);
        this.contactForm.reset();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not send your message. Please try again.');
      },
    });
  }

  sendAnother(): void {
    this.submitted.set(false);
  }
}
