import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin/admin.service';
import { AdminPromoCode } from '../../../core/admin/admin.models';

@Component({
  selector: 'app-admin-promo-codes',
  templateUrl: './admin-promo-codes.component.html',
  styleUrls: ['../admin-shared.css', './admin-promo-codes.component.css'],
  imports: [NgFor, NgIf, FormsModule],
})
export class AdminPromoCodesComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly promoCodes = signal<AdminPromoCode[]>([]);
  readonly errorMessage = signal<string | null>(null);
  newPromoCode = '';
  newPromoDiscount = 20;
  newPromoMaxRedemptions: number | null = null;

  ngOnInit(): void {
    this.loadPromoCodes();
  }

  loadPromoCodes(): void {
    this.adminService.listPromoCodes().subscribe({
      next: (codes) => this.promoCodes.set(codes),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }

  createPromoCode(): void {
    if (!this.newPromoCode.trim()) return;
    this.adminService
      .createPromoCode(this.newPromoCode.trim(), this.newPromoDiscount, this.newPromoMaxRedemptions, null)
      .subscribe({
        next: () => {
          this.newPromoCode = '';
          this.newPromoDiscount = 20;
          this.newPromoMaxRedemptions = null;
          this.loadPromoCodes();
        },
        error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
      });
  }

  togglePromoActive(promo: AdminPromoCode): void {
    this.adminService.setPromoCodeActive(promo.id, !promo.isActive).subscribe({
      next: () => this.loadPromoCodes(),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }
}
