import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.logout();
  }
}
