import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { PagedResponse } from '../models/api-response.model';
import { NotificationItem } from '../models/notification.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationStateService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isLoading = signal<boolean>(false);

  constructor() {
    // Automatically load unread count when user is authenticated
    if (this.auth.isAuthenticated()) {
      this.loadUnreadCount();
    }
  }

  loadUnreadCount(): void {
    if (!this.auth.isAuthenticated()) return;

    this.api.get<{ unreadCount: number }>('/notifications/unread-count').subscribe({
      next: (res) => {
        this.unreadCount.set(res.unreadCount || 0);
      },
      error: (err) => {
        console.warn('Could not load unread notification count:', err);
      }
    });
  }

  loadNotifications(page = 0, size = 30): void {
    this.isLoading.set(true);
    this.api.get<PagedResponse<NotificationItem>>('/notifications', { page, size }).subscribe({
      next: (res) => {
        this.notifications.set(res.content);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.isLoading.set(false);
      }
    });
  }

  markAsRead(id: string): void {
    // Optimistic UI update
    this.notifications.update(list =>
      list.map(item => item.id === id ? { ...item, isRead: true } : item)
    );
    this.unreadCount.update(c => Math.max(0, c - 1));

    this.api.put<void>(`/notifications/${id}/read`, {}).subscribe({
      error: () => this.loadUnreadCount() // Rollback/refresh on error
    });
  }

  markAllAsRead(): void {
    // Optimistic UI update
    this.notifications.update(list =>
      list.map(item => ({ ...item, isRead: true }))
    );
    this.unreadCount.set(0);

    this.api.put<void>('/notifications/read-all', {}).subscribe({
      error: () => this.loadUnreadCount()
    });
  }
}
