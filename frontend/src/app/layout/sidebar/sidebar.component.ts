import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'mv-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <aside class="sidebar">
      <nav class="nav-list">
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path" 
             routerLinkActive="active" 
             [routerLinkActiveOptions]="{ exact: !!item.exact }"
             class="nav-link">
            <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="quote-card">
          <div class="quote-text">"Preserving the moments that shaped our journey together."</div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      min-height: calc(100vh - 72px);
      background-color: var(--mv-bg-surface);
      border-right: 1px solid var(--mv-border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--space-3) var(--space-2);
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 16px;
      border-radius: var(--radius-md);
      color: var(--mv-text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .nav-link:hover {
      background-color: var(--mv-bg-subtle);
      color: var(--mv-text-primary);
    }

    .nav-link.active {
      background-color: #fef3c7; /* Warm amber-50 */
      color: var(--mv-primary);
      font-weight: 600;
    }

    .nav-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .sidebar-footer {
      padding: var(--space-2);
    }

    .quote-card {
      padding: var(--space-2);
      background-color: var(--mv-bg-subtle);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--mv-primary);
    }

    .quote-text {
      font-family: var(--font-editorial);
      font-style: italic;
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--mv-text-secondary);
    }
  `]
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/journeys', label: 'Journeys', icon: 'auto_stories' },
    { path: '/memories', label: 'Memories', icon: 'photo_library' },
    { path: '/gallery', label: 'Media Gallery', icon: 'collections' },
    { path: '/assistant', label: 'AI Assistant', icon: 'auto_awesome' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications' },
    { path: '/profile', label: 'My Profile', icon: 'person' }
  ];
}
