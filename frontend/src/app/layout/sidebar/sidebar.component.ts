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
