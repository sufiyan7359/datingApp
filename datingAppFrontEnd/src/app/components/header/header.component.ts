import { Component, HostListener, inject } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [NgStyle, NgIf, RouterLink],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  bgColor = 'transparent'; // Initialize header as transparent
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;

  @HostListener('window:scroll')
  onScroll() {
    if (window.pageYOffset > 10) {
      this.bgColor = '#ffff'; // Change background color after scrolling 50px
    } else {
      this.bgColor = 'transparent'; // Change background color back to transparent
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
