import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { VerificationService } from '../../core/verification/verification.service';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.css'],
  imports: [NgIf, DatePipe],
})
export class VerificationComponent implements OnInit {
  private readonly verificationService = inject(VerificationService);

  readonly status = this.verificationService.status;
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    this.verificationService.loadStatus().subscribe();
  }

  onSelfieSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    this.verificationService.submit(file).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        input.value = '';
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not submit your selfie.');
        input.value = '';
      },
    });
  }
}
