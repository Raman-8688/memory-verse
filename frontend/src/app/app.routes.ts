import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'journeys',
        loadComponent: () => import('./features/journeys/journey-list.component').then(m => m.JourneyListComponent)
      },
      {
        path: 'journeys/:id',
        loadComponent: () => import('./features/journeys/journey-detail.component').then(m => m.JourneyDetailComponent)
      },
      {
        path: 'memories',
        loadComponent: () => import('./features/memories/memory-feed.component').then(m => m.MemoryFeedComponent)
      },
      {
        path: 'memories/new',
        loadComponent: () => import('./features/memories/memory-stepper-create.component').then(m => m.MemoryStepperCreateComponent)
      },
      {
        path: 'memories/:id',
        loadComponent: () => import('./features/memories/memory-detail.component').then(m => m.MemoryDetailComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery-grid.component').then(m => m.GalleryGridComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications-list.component').then(m => m.NotificationsListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
