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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  readonly notificationState = inject(NotificationStateService);
  readonly authService = inject(AuthService);

  readonly primaryNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'space_dashboard', exact: true },
    { path: '/journeys', label: 'Journeys', icon: 'auto_stories', exact: true },
    { path: '/memories', label: 'Memories', icon: 'photo_library', exact: true },
    { path: '/timeline', label: 'Timeline', icon: 'schedule', exact: true },
    { path: '/places', label: 'Places', icon: 'place', exact: true },
    { path: '/people', label: 'People', icon: 'groups', exact: true },
    { path: '/on-this-day', label: 'On This Day', icon: 'event_repeat', exact: true },
    { path: '/assistant', label: 'Ask AI', icon: 'auto_awesome', isAi: true, exact: true }
  ];

  readonly secondaryNavItems: NavItem[] = [
    { path: '/gallery', label: 'Media Gallery', icon: 'collections' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications' }
  ];
}
