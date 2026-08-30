import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'mv-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <header class="navbar">
      <div class="navbar-brand">
        <a routerLink="/dashboard" class="brand-link">
          <span class="brand-name">MemoryVerse</span>
          <span class="brand-tagline">Our Journey, Our Memories</span>
        </a>
      </div>

      <div class="navbar-actions">
        <button mat-icon-button class="notification-btn" routerLink="/notifications" aria-label="Notifications">
          <mat-icon>notifications_none</mat-icon>
        </button>

        @if (authService.currentUser(); as user) {
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-profile-btn">
            <img [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'" 
                 [alt]="user.fullName" 
                 class="user-avatar">
            <span class="user-name">{{ user.fullName }}</span>
            <mat-icon class="dropdown-icon">expand_more</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu" xPosition="before" class="editorial-menu">
            <div class="menu-header">
              <div class="menu-user-name">{{ user.fullName }}</div>
              <div class="menu-user-role">{{ user.role }}</div>
            </div>
            <a mat-menu-item routerLink="/profile">
              <mat-icon>person_outline</mat-icon>
              <span>Profile</span>
            </a>
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign Out</span>
            </button>
          </mat-menu>
        }
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4);
      background-color: var(--mv-bg-surface);
      border-bottom: 1px solid var(--mv-border);
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .brand-link {
      text-decoration: none;
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-family: var(--font-editorial);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--mv-text-primary);
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .brand-tagline {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .user-profile-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background-color: var(--mv-bg-subtle);
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--mv-primary);
    }

    .user-name {
      font-weight: 600;
      color: var(--mv-text-primary);
      font-size: 0.875rem;
    }

    .dropdown-icon {
      font-size: 20px;
      color: var(--mv-text-secondary);
      margin-left: -4px;
    }

    .menu-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--mv-border);
    }

    .menu-user-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--mv-text-primary);
    }

    .menu-user-role {
      font-size: 0.75rem;
      color: var(--mv-primary);
      font-weight: 600;
      text-transform: uppercase;
    }

    @media (max-width: 640px) {
      .navbar {
        padding: 0 var(--space-2);
      }
      .user-name {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
}
