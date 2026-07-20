import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * Renders a user's photo, or - when they don't have one - a colored circle
 * with their initials instead of a mismatched stock/placeholder image. Fills
 * whatever box its parent gives it, so it takes on that parent's shape
 * (circle avatar, rounded card, ...) and the initials scale to match via
 * container query units - no size preset to pick per call site.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css'],
})
export class UserAvatarComponent {
  @Input() photoUrl: string | null = null;
  @Input() firstName = '';
  @Input() lastName = '';

  get initials(): string {
    const first = this.firstName.trim();
    const last = this.lastName.trim();
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first.length >= 2) {
      return first.slice(0, 2).toUpperCase();
    }
    return (first[0] ?? '?').toUpperCase();
  }

  get background(): string {
    const seed = `${this.firstName}${this.lastName}`.trim() || '?';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 48%), hsl(${(hue + 35) % 360}, 65%, 36%))`;
  }
}
