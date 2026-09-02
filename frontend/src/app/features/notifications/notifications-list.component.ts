import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationStateService } from '@core/services/notification-state.service';
import { NotificationItem, NotificationType } from '@core/models/notification.model';

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
  templateUrl: './notifications-list.component.html',
  styleUrl: './notifications-list.component.scss'
})
export class NotificationsListComponent implements OnInit {
  readonly notificationState = inject(NotificationStateService);
  private readonly router = inject(Router);

  readonly activeFilter = signal<'ALL' | 'UNREAD'>('ALL');

  readonly filteredNotifications = computed<NotificationItem[]>(() => {
    const list = this.notificationState.notifications();
    if (this.activeFilter() === 'UNREAD') {
      return list.filter(item => !item.isRead);
    }
    return list;
  });

  ngOnInit(): void {
    this.notificationState.loadNotifications();
  }

  setFilter(filter: 'ALL' | 'UNREAD'): void {
    this.activeFilter.set(filter);
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead) {
      this.notificationState.markAsRead(item.id);
    }
    if (item.relatedEntityId) {
      if (item.type === 'JOURNEY_UPDATED' || item.type === 'CHAPTER_UPDATED') {
        this.router.navigate(['/journeys', item.relatedEntityId]);
      } else {
        this.router.navigate(['/memories', item.relatedEntityId]);
      }
    }
  }

  onMarkAsReadClick(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    if (!item.isRead) {
      this.notificationState.markAsRead(item.id);
    }
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'TAGGED':
        return 'person_add';
      case 'MEMORY_CREATED':
        return 'auto_stories';
      case 'MEMORY_UPDATED':
        return 'edit_note';
      case 'MEDIA_ADDED':
        return 'photo_library';
      case 'JOURNEY_UPDATED':
        return 'collections_bookmark';
      case 'CHAPTER_UPDATED':
        return 'bookmark';
      case 'SYSTEM':
      default:
        return 'notifications';
    }
  }

  getIconClass(type: NotificationType): string {
    switch (type) {
      case 'TAGGED':
        return 'tagged-type';
      case 'MEMORY_CREATED':
      case 'MEMORY_UPDATED':
      case 'MEDIA_ADDED':
        return 'memory-type';
      case 'JOURNEY_UPDATED':
      case 'CHAPTER_UPDATED':
        return 'otd-type';
      case 'SYSTEM':
      default:
        return 'system-type';
    }
  }

  formatTypeLabel(type: NotificationType): string {
    switch (type) {
      case 'TAGGED':
        return 'Tagged in Story';
      case 'MEMORY_CREATED':
        return 'New Memory Shared';
      case 'MEMORY_UPDATED':
        return 'Memory Updated';
      case 'MEDIA_ADDED':
        return 'Photos Added';
      case 'JOURNEY_UPDATED':
        return 'Journey Milestone';
      case 'CHAPTER_UPDATED':
        return 'Chapter Update';
      case 'SYSTEM':
      default:
        return 'Circle Activity';
    }
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
