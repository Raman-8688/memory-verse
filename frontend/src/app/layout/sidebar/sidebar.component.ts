import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationStateService } from '@core/services/notification-state.service';
import { AuthService } from '@core/auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  isAi?: boolean;
}

@Component({
  selector: 'mv-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <aside class="sidebar">
      <!-- Main Core Navigation (Phase 3 Shell) -->
      <div class="sidebar-top">
        <div class="nav-section-label">MEMORIES & JOURNEY</div>
        <nav class="nav-list">
          @for (item of primaryNavItems; track item.path) {
            <a [routerLink]="item.path" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{ exact: !!item.exact }"
               class="nav-link"
               [class.ai-item]="item.isAi">
              <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.isAi) {
                <span class="ai-pill">AI</span>
              }
            </a>
          }
        </nav>

        <div class="nav-divider"></div>

        <div class="nav-section-label">ARCHIVE & DISCOVERY</div>
        <nav class="nav-list">
          @for (item of secondaryNavItems; track item.path) {
            <a [routerLink]="item.path" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{ exact: !!item.exact }"
               class="nav-link">
              <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.path === '/notifications' && notificationState.unreadCount() > 0) {
                <span class="sidebar-badge">
                  {{ notificationState.unreadCount() > 99 ? '99+' : notificationState.unreadCount() }}
                </span>
              }
            </a>
          }
        </nav>
      </div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <nav class="nav-list settings-list">
          <a [routerLink]="authService.isAdmin() ? '/admin/group' : '/profile'" 
             routerLinkActive="active" 
             class="nav-link">
            <mat-icon class="nav-icon">settings</mat-icon>
            <span class="nav-label">Settings</span>
          </a>
        </nav>

        <div class="quote-card">
          <div class="quote-text">"The years pass, but these moments remain frozen in light."</div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      min-height: calc(100vh - 72px);
      background-color: var(--mv-bg-surface);
      border-right: 1px solid var(--mv-border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--mv-space-16) var(--mv-space-12);
      box-sizing: border-box;
    }

    .sidebar-top {
      display: flex;
      flex-direction: column;
    }

    .nav-section-label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--mv-text-muted);
      padding: var(--mv-space-8) var(--mv-space-12) var(--mv-space-4);
      text-transform: uppercase;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--mv-space-12);
      padding: 9px var(--mv-space-12);
      border-radius: var(--mv-radius-sm);
      color: var(--mv-text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.885rem;
      transition: all var(--mv-transition-fast);
      position: relative;
    }

    .nav-link:hover {
      background-color: var(--mv-bg-subtle);
      color: var(--mv-text-primary);
    }

    .nav-link.active {
      background-color: var(--mv-primary-light);
      color: var(--mv-primary);
      font-weight: 600;
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background-color: var(--mv-primary);
      border-radius: var(--mv-radius-full);
    }

    .nav-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: inherit;
    }

    .ai-item.active {
      background-color: var(--mv-ai-subtle);
      color: var(--mv-ai-accent);
    }

    .ai-item.active::before {
      background-color: var(--mv-ai-accent);
    }

    .ai-pill {
      margin-left: auto;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--mv-radius-full);
      background-color: var(--mv-ai-subtle);
      color: var(--mv-ai-accent);
      border: 1px solid var(--mv-ai-border);
      letter-spacing: 0.04em;
    }

    .nav-divider {
      height: 1px;
      background-color: var(--mv-border-subtle);
      margin: var(--mv-space-12) var(--mv-space-8);
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: var(--mv-space-12);
      padding-top: var(--mv-space-12);
      border-top: 1px solid var(--mv-border-subtle);
    }

    .quote-card {
      padding: var(--mv-space-12);
      background-color: var(--mv-bg-subtle);
      border-radius: var(--mv-radius-sm);
      border-left: 2px solid var(--mv-primary);
    }

    .quote-text {
      font-family: var(--font-editorial);
      font-style: italic;
      font-size: 0.84rem;
      line-height: 1.4;
      color: var(--mv-text-secondary);
    }

    .sidebar-badge {
      margin-left: auto;
      background-color: var(--mv-danger);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class SidebarComponent {
  readonly notificationState = inject(NotificationStateService);
  readonly authService = inject(AuthService);

  // Desktop Navigation per Phase 3 Shell Specification
  readonly primaryNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: 'home', exact: true },
    { path: '/assistant', label: 'Ask AI', icon: 'auto_awesome', isAi: true },
    { path: '/memories', label: 'Memories', icon: 'photo_library' },
    { path: '/timeline', label: 'Timeline', icon: 'schedule' },
    { path: '/places', label: 'Places', icon: 'place' },
    { path: '/people', label: 'People', icon: 'groups' },
    { path: '/journeys', label: 'Journeys', icon: 'auto_stories' },
    { path: '/on-this-day', label: 'On This Day', icon: 'event_repeat' }
  ];

  readonly secondaryNavItems: NavItem[] = [
    { path: '/gallery', label: 'Media Gallery', icon: 'collections' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications' }
  ];
}
