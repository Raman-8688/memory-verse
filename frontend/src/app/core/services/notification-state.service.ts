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
  private isFetchingUnread = false;
  private lastFetchTime = 0;
  private consecutiveErrors = 0;

  constructor() {
    // Automatically load unread count when user is authenticated
    if (this.auth.isAuthenticated()) {
      this.loadUnreadCount();
      this.startPolling();
    }

    // Also refresh on window focus / tab visibility change (with 30s debounce)
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.auth.isAuthenticated()) {
          const now = Date.now();
          if (now - this.lastFetchTime > 30000) {
            this.loadUnreadCount();
          }
        }
      });
    }
  }

  startPolling(): void {
    if (this.pollIntervalId) return;
    // Poll unread count conservatively every 60 seconds (only if tab is actively visible)
    this.pollIntervalId = setInterval(() => {
      if (this.auth.isAuthenticated() && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        // If consecutive errors occurred (e.g. backend restarting), back off
        if (this.consecutiveErrors > 3 && Math.random() < 0.5) {
          return;
        }
        this.loadUnreadCount();
      }
    }, 60000);
  }

  stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  loadUnreadCount(): void {
    if (!this.auth.isAuthenticated() || this.isFetchingUnread) return;

    this.isFetchingUnread = true;
    this.api.get<{ unreadCount: number }>('/notifications/unread-count').subscribe({
      next: (res) => {
        this.isFetchingUnread = false;
        this.lastFetchTime = Date.now();
        this.consecutiveErrors = 0;
        this.unreadCount.set(res?.unreadCount ?? 0);
      },
      error: (err) => {
        this.isFetchingUnread = false;
        this.consecutiveErrors++;
        // Only log once on initial failure so console isn't spammed while backend restarts
        if (this.consecutiveErrors <= 1) {
          console.warn('Could not load unread notification count (server may be offline/restarting):', err.status);
        }
      }
    });
  }

  loadNotifications(page = 0, size = 30): void {
    this.isLoading.set(true);
    this.api.get<PagedResponse<any>>('/notifications', { page, size }).subscribe({
      next: (res) => {
        const rawList = res.content || [];
        const normalized: NotificationItem[] = rawList.map((item: any) => ({
          ...item,
          isRead: item.isRead !== undefined ? Boolean(item.isRead) : Boolean(item.read),
          read: item.read !== undefined ? Boolean(item.read) : Boolean(item.isRead)
        }));
        this.notifications.set(normalized);
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
      list.map(item => item.id === id ? { ...item, isRead: true, read: true } : item)
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
      list.map(item => ({ ...item, isRead: true, read: true }))
    );
    this.unreadCount.set(0);

    this.api.put<void>('/notifications/read-all', {}).subscribe({
      next: () => this.loadUnreadCount(),
      error: () => this.loadUnreadCount()
    });
  }
}
