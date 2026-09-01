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

  private pollIntervalId: any = null;

  constructor() {
    // Automatically load unread count when user is authenticated
    if (this.auth.isAuthenticated()) {
      this.loadUnreadCount();
      this.startPolling();
    }

    // Also refresh on window focus / tab visibility change
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.auth.isAuthenticated()) {
          this.loadUnreadCount();
        }
      });
    }
  }

  startPolling(): void {
    if (this.pollIntervalId) return;
    // Poll unread count every 15 seconds
    this.pollIntervalId = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.loadUnreadCount();
      }
    }, 15000);
  }

  stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  loadUnreadCount(): void {
    if (!this.auth.isAuthenticated()) return;

    this.api.get<{ unreadCount: number }>('/notifications/unread-count').subscribe({
      next: (res) => {
        this.unreadCount.set(res?.unreadCount ?? 0);
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
        this.notifications.set(res.content || []);
        this.isLoading.set(false);
        // Refresh unread count in sync
        this.loadUnreadCount();
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.isLoading.set(false);
      }
    });
  }

  refresh(): void {
    this.loadUnreadCount();
    if (this.notifications().length > 0) {
      this.loadNotifications();
    }
  }

  markAsRead(id: string): void {
    // Optimistic UI update
    this.notifications.update(list =>
      list.map(item => item.id === id ? { ...item, isRead: true } : item)
    );
    this.unreadCount.update(c => Math.max(0, c - 1));

    this.api.put<void>(`/notifications/${id}/read`, {}).subscribe({
      next: () => this.loadUnreadCount(),
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
      next: () => this.loadUnreadCount(),
      error: () => this.loadUnreadCount()
    });
  }
}
