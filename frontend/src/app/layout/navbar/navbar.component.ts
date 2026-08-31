import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { AuthService } from '@core/auth/auth.service';
import { NotificationStateService } from '@core/services/notification-state.service';
import { MediaCaptureService } from '@core/services/media-capture.service';

@Component({
  selector: 'mv-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule, MatBottomSheetModule],
  template: `
    <header class="navbar">
      <div class="navbar-brand">
        <a routerLink="/dashboard" class="brand-link">
          <span class="brand-name">MemoryVerse</span>
          <span class="brand-tagline">Our Journey, Our Memories</span>
        </a>
      </div>

      <div class="navbar-actions">
        <button mat-stroked-button class="quick-capture-btn" (click)="captureService.openCaptureFlow()" title="Quick Add Media">
          <mat-icon>add_a_photo</mat-icon>
          <span class="btn-text">Capture</span>
        </button>

        <button mat-icon-button class="assistant-btn" routerLink="/assistant" aria-label="Memory Assistant" title="Memory Assistant">
          <mat-icon>auto_awesome</mat-icon>
        </button>

        <button mat-icon-button class="notification-btn" routerLink="/notifications" aria-label="Notifications">
          <div class="bell-wrapper">
            <mat-icon>{{ notificationState.unreadCount() > 0 ? 'notifications' : 'notifications_none' }}</mat-icon>
            @if (notificationState.unreadCount() > 0) {
              <span class="unread-badge">
                {{ notificationState.unreadCount() > 99 ? '99+' : notificationState.unreadCount() }}
              </span>
            }
          </div>
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
            @if (authService.isAdmin()) {
              <a mat-menu-item routerLink="/admin/group">
                <mat-icon>manage_accounts</mat-icon>
                <span>Group Management</span>
              </a>
            }
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

    .assistant-btn {
      color: var(--mv-primary);
      transition: transform 0.2s ease, background-color 0.2s ease;
    }

    .assistant-btn:hover {
      background-color: var(--mv-bg-subtle);
      transform: scale(1.05);
    }

    .bell-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background-color: #dc2626; /* Vibrant red badge */
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .quick-capture-btn {
      border-color: var(--mv-primary);
      color: var(--mv-primary);
      border-radius: var(--radius-full);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0 14px;
      height: 36px;
    }

    .quick-capture-btn:hover {
      background-color: #fef3c7;
    }

    @media (max-width: 640px) {
      .navbar {
        padding: 0 var(--space-2);
      }
      .user-name, .btn-text {
        display: none;
      }
      .quick-capture-btn {
        padding: 0 8px;
        min-width: 36px;
      }
    }
  `]
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly notificationState = inject(NotificationStateService);
  readonly captureService = inject(MediaCaptureService);
}
