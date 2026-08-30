import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationStateService } from '@core/services/notification-state.service';
import { NotificationItem } from '@core/models/notification.model';

@Component({
  selector: 'mv-notifications-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="notifications-page">
      <!-- Header -->
      <header class="notifications-header">
        <div class="header-info">
          <span class="sub-label">Activity Center</span>
          <h1 class="editorial-title">Notifications & Updates</h1>
          <p class="header-desc">
            Stay in the loop when friends tag you in newly preserved memories and milestones.
          </p>
        </div>

        @if (notificationState.notifications().length > 0 && notificationState.unreadCount() > 0) {
          <button mat-button class="mark-all-btn" (click)="notificationState.markAllAsRead()">
            <ng-container>
              <mat-icon>done_all</mat-icon>
              <span>Mark all as read</span>
            </ng-container>
          </button>
        }
      </header>

      <!-- Content -->
      @if (notificationState.isLoading()) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Fetching your activity stream...</span>
        </div>
      } @else if (notificationState.notifications().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>notifications_none</mat-icon>
          </div>
          <h3 class="editorial-title">You're All Caught Up</h3>
          <p>No new notifications right now. When someone mentions or tags you, you'll see it here.</p>
          <a mat-flat-button color="primary" routerLink="/memories">
            <ng-container>
              <mat-icon>photo_library</mat-icon>
              <span>Browse Memories</span>
            </ng-container>
          </a>
        </div>
      } @else {
        <!-- Notifications List -->
        <div class="notifications-card">
          <div class="notifications-stream">
            @for (item of notificationState.notifications(); track item.id) {
              <div class="notification-item" 
                   [class.unread]="!item.isRead"
                   (click)="onNotificationClick(item)">
                
                <!-- Type Icon / Avatar -->
                <div class="item-icon" [class.tagged]="item.type === 'TAGGED'">
                  <mat-icon>{{ getNotificationIcon(item.type) }}</mat-icon>
                </div>

                <!-- Content -->
                <div class="item-body">
                  <p class="item-message">{{ item.message }}</p>
                  <span class="item-time">{{ formatTime(item.createdAt) }}</span>
                </div>

                <!-- Unread Indicator Dot -->
                @if (!item.isRead) {
                  <div class="unread-dot" title="Unread"></div>
                }

                <!-- Action Chevron -->
                <mat-icon class="chevron-icon">chevron_right</mat-icon>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-page {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .sub-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.4rem;
      margin: 2px 0 6px 0;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.92rem;
      margin: 0;
    }

    .mark-all-btn {
      color: var(--mv-primary) !important;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .notifications-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      box-shadow: var(--shadow-card);
    }

    .notifications-stream {
      display: flex;
      flex-direction: column;
    }

    .notification-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--mv-border);
      cursor: pointer;
      transition: background-color 0.2s ease;
      position: relative;
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item:hover {
      background-color: var(--mv-bg-subtle);
    }

    .notification-item.unread {
      background-color: #fefce8; /* Warm subtle amber highlight */
    }

    .notification-item.unread:hover {
      background-color: #fef9c3;
    }

    .item-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--mv-bg-subtle);
      color: var(--mv-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-icon.tagged {
      background-color: #fef3c7;
      color: var(--mv-primary);
    }

    .item-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .item-body {
      flex: 1;
      min-width: 0;
    }

    .item-message {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      color: var(--mv-text-primary);
      line-height: 1.4;
    }

    .item-time {
      font-size: 0.78rem;
      color: var(--mv-text-muted);
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--mv-primary);
      flex-shrink: 0;
    }

    .chevron-icon {
      color: var(--mv-text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .loading-state, .empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
  `]
})
export class NotificationsListComponent implements OnInit {
  readonly notificationState = inject(NotificationStateService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.notificationState.loadNotifications();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'TAGGED': return 'local_offer';
      case 'MEMORY_CREATED': return 'photo';
      default: return 'info';
    }
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead) {
      this.notificationState.markAsRead(item.id);
    }

    if (item.relatedEntityId) {
      this.router.navigate(['/memories', item.relatedEntityId]);
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
