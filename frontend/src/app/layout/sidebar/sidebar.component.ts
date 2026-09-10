import { Component, Input, Output, EventEmitter, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationStateService } from '@core/services/notification-state.service';
import { AuthService } from '@core/auth/auth.service';
import { SidebarService } from '@core/services/sidebar.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  isAi?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

@Component({
  selector: 'mv-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatIconModule, 
    MatTooltipModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnDestroy {
  @Input() forceExpanded = false;
  @Output() readonly navigated = new EventEmitter<void>();

  readonly notificationState = inject(NotificationStateService);
  readonly authService = inject(AuthService);
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  get isEffectivelyCollapsed(): boolean {
    return !this.forceExpanded && this.sidebarService.isCollapsed();
  }

  // Active expanded section id in accordion (only one open at a time)
  readonly expandedSection = signal<string | null>(null);

  readonly homeItem: NavItem = {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'space_dashboard',
    exact: true
  };

  readonly navSections: NavSection[] = [
    {
      id: 'memories',
      title: 'Memories',
      icon: 'auto_stories',
      items: [
        { path: '/journeys', label: 'Journeys', icon: 'auto_stories', exact: false },
        { path: '/memories', label: 'Memories', icon: 'photo_library', exact: true },
        { path: '/group-chat', label: 'Group Chat', icon: 'forum', exact: false },
        { path: '/moments', label: 'Moments', icon: 'camera_alt', exact: false },
        { path: '/timeline', label: 'Timeline', icon: 'schedule', exact: true },
        { path: '/favorites', label: 'Favorites', icon: 'favorite_border', exact: true },
        { path: '/collections', label: 'Collections', icon: 'collections_bookmark', exact: false }
      ]
    },
    {
      id: 'explore',
      title: 'Explore',
      icon: 'explore',
      items: [
        { path: '/people', label: 'People', icon: 'groups', exact: true },
        { path: '/places', label: 'Places', icon: 'place', exact: true },
        { path: '/map', label: 'Memory Map', icon: 'map', exact: true },
        { path: '/on-this-day', label: 'On This Day', icon: 'event_repeat', exact: true },
        { path: '/gallery', label: 'Media Gallery', icon: 'collections', exact: true }
      ]
    },
    {
      id: 'ai-discovery',
      title: 'AI & Discovery',
      icon: 'psychology',
      items: [
        { path: '/assistant', label: 'Ask AI', icon: 'auto_awesome', isAi: true, exact: true },
        { path: '/guide', label: 'User Guide', icon: 'menu_book', exact: true },
        { path: '/developer', label: 'Developer', icon: 'code', exact: true }
      ]
    },
    {
      id: 'archive',
      title: 'Archive',
      icon: 'inventory_2',
      items: [
        { path: '/notifications', label: 'Notifications', icon: 'notifications', exact: true },
        { path: '/trash', label: 'Trash Bin', icon: 'delete_outline', exact: true }
      ]
    }
  ];

  private readonly routeSub: Subscription;

  constructor() {
    this.syncSectionWithRoute(this.router.url);

    this.routeSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.syncSectionWithRoute(e.urlAfterRedirects || e.url);
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  toggleSection(sectionId: string): void {
    if (this.isEffectivelyCollapsed) {
      this.sidebarService.expand();
      this.expandedSection.set(sectionId);
      return;
    }
    this.expandedSection.update(current => current === sectionId ? null : sectionId);
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSection() === sectionId;
  }

  isSectionActive(section: NavSection): boolean {
    const currentUrl = this.cleanUrl(this.router.url);
    return section.items.some(item => this.matchesItem(currentUrl, item));
  }

  getSectionBadgeCount(sectionId: string): number {
    if (sectionId === 'archive') {
      return this.notificationState.unreadCount();
    }
    return 0;
  }

  onLinkClick(): void {
    this.navigated.emit();
  }

  private cleanUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private matchesItem(currentUrl: string, item: NavItem): boolean {
    if (item.exact) {
      return currentUrl === item.path;
    }
    return currentUrl === item.path || currentUrl.startsWith(item.path + '/');
  }

  private syncSectionWithRoute(url: string): void {
    const clean = this.cleanUrl(url);
    for (const section of this.navSections) {
      const match = section.items.some(item => {
        if (item.exact) {
          return clean === item.path;
        }
        return clean === item.path || clean.startsWith(item.path + '/');
      });

      if (match) {
        this.expandedSection.set(section.id);
        return;
      }

      const detailMatch = section.items.some(item => clean.startsWith(item.path + '/'));
      if (detailMatch) {
        this.expandedSection.set(section.id);
        return;
      }
    }

    if (clean === '/' || clean === '/dashboard' || clean.startsWith('/profile') || clean.startsWith('/admin')) {
      this.expandedSection.set(null);
    }
  }
}
