import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, fromEvent } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { NotificationStateService } from '@core/services/notification-state.service';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { CommandPaletteService } from '@core/services/command-palette.service';
import { SidebarService } from '@core/services/sidebar.service';

import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';

@Component({
  selector: 'mv-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatBottomSheetModule,
    MatTooltipModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly notificationState = inject(NotificationStateService);
  readonly captureService = inject(MediaCaptureService);
  readonly paletteService = inject(CommandPaletteService);
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  readonly isDashboard = signal<boolean>(false);
  readonly isScrolled = signal<boolean>(false);
  readonly pageTitle = signal<string>( 'Dashboard');
  readonly isNotificationPanelOpen = signal<boolean>(false);

  readonly recentNotifications = computed(() => {
    const list = this.notificationState.notifications();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return list.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  });

  readonly earlierNotifications = computed(() => {
    const list = this.notificationState.notifications();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return list.filter((item) => new Date(item.createdAt).getTime() < cutoff);
  });

  private readonly destroy$ = new Subject<void>();

  toggleNotificationPanel(): void {
    const nextState = !this.isNotificationPanelOpen();
    this.isNotificationPanelOpen.set(nextState);
    if (nextState) {
      this.notificationState.loadNotifications(0, 30);
    }
  }

  closeNotificationPanel(): void {
    this.isNotificationPanelOpen.set(false);
  }

  onNotificationClick(item: any): void {
    if (!item.isRead) {
      this.notificationState.markAsRead(item.id);
    }
    this.closeNotificationPanel();

    if (item.type === 'MENTION' || item.type === 'REPLY') {
      const gId = item.groupId || item.relatedEntityId;
      const mId = item.messageId;
      if (gId) {
        this.router.navigate(['/group-chat', gId], {
          queryParams: mId ? { messageId: mId } : undefined
        });
        return;
      }
    } else if (item.type === 'GROUP_MEMBER_ADDED' || item.type === 'GROUP_MEMBER_REMOVED' || item.type === 'GROUP_ROLE_CHANGED') {
      const gId = item.groupId || item.relatedEntityId;
      if (gId) {
        this.router.navigate(['/group-chat', gId]);
        return;
      }
    } else if (item.relatedEntityId) {
      if (item.type === 'JOURNEY_UPDATED' || item.type === 'CHAPTER_UPDATED') {
        this.router.navigate(['/journeys', item.relatedEntityId]);
      } else {
        this.router.navigate(['/memories', item.relatedEntityId]);
      }
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'MENTION':
        return 'alternate_email';
      case 'REPLY':
        return 'reply';
      case 'GROUP_MEMBER_ADDED':
        return 'group_add';
      case 'GROUP_MEMBER_REMOVED':
        return 'person_remove';
      case 'GROUP_ROLE_CHANGED':
        return 'admin_panel_settings';
      case 'TAGGED':
        return 'person_add';
      case 'MEMORY_CREATED':
      case 'MEMORY_UPDATED':
        return 'auto_stories';
      case 'MEDIA_ADDED':
        return 'photo_library';
      case 'JOURNEY_UPDATED':
      case 'CHAPTER_UPDATED':
        return 'collections_bookmark';
      case 'SYSTEM':
      default:
        return 'notifications';
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

  ngOnInit(): void {
    this.updateRouteStatus(this.router.url);

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e) => {
      this.updateRouteStatus(e.urlAfterRedirects || e.url);
      this.checkScroll();
    });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'scroll', { passive: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.checkScroll());

      setTimeout(() => {
        const mainContent = document.querySelector('.layout-main-content');
        if (mainContent) {
          fromEvent(mainContent, 'scroll', { passive: true })
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.checkScroll());
        }
        this.checkScroll();
      }, 100);
    }
  }

  private updateRouteStatus(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isDashboard.set(cleanUrl === '/' || cleanUrl === '/dashboard');

    if (cleanUrl === '/' || cleanUrl === '/dashboard') {
      this.pageTitle.set('Dashboard');
    } else if (cleanUrl.startsWith('/journeys')) {
      this.pageTitle.set('Journeys');
    } else if (cleanUrl.startsWith('/memories')) {
      this.pageTitle.set('Memories');
    } else if (cleanUrl.startsWith('/moments')) {
      this.pageTitle.set('Moments');
    } else if (cleanUrl.startsWith('/timeline')) {
      this.pageTitle.set('Timeline');
    } else if (cleanUrl.startsWith('/favorites')) {
      this.pageTitle.set('Favorites');
    } else if (cleanUrl.startsWith('/collections')) {
      this.pageTitle.set('Collections');
    } else if (cleanUrl.startsWith('/people')) {
      this.pageTitle.set('People');
    } else if (cleanUrl.startsWith('/places')) {
      this.pageTitle.set('Places');
    } else if (cleanUrl.startsWith('/map')) {
      this.pageTitle.set('Memory Map');
    } else if (cleanUrl.startsWith('/on-this-day')) {
      this.pageTitle.set('On This Day');
    } else if (cleanUrl.startsWith('/gallery')) {
      this.pageTitle.set('Media Gallery');
    } else if (cleanUrl.startsWith('/assistant')) {
      this.pageTitle.set('Ask AI');
    } else if (cleanUrl.startsWith('/guide')) {
      this.pageTitle.set('User Guide');
    } else if (cleanUrl.startsWith('/developer')) {
      this.pageTitle.set('Developer');
    } else if (cleanUrl.startsWith('/notifications')) {
      this.pageTitle.set('Notifications');
    } else if (cleanUrl.startsWith('/trash')) {
      this.pageTitle.set('Trash Bin');
    } else if (cleanUrl.startsWith('/profile')) {
      this.pageTitle.set('Profile');
    } else if (cleanUrl.startsWith('/admin')) {
      this.pageTitle.set('Administration');
    } else {
      this.pageTitle.set('MemoryVerse');
    }
  }

  private checkScroll(): void {
    const winScroll = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
    const mainContent = typeof document !== 'undefined' ? document.querySelector('.layout-main-content') : null;
    const contentScroll = mainContent ? mainContent.scrollTop : 0;
    const scrollPos = Math.max(winScroll, contentScroll);
    this.isScrolled.set(scrollPos > 20);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
