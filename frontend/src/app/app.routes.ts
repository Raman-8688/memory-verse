import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 's/:token',
    loadComponent: () => import('./features/share/public-share.component').then(m => m.PublicShareComponent)
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
        path: 'journeys/:id/storybook',
        loadComponent: () => import('./features/journeys/journey-storybook/journey-storybook.component').then(m => m.JourneyStorybookComponent)
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
        path: 'capture/review',
        loadComponent: () => import('./features/capture/quick-add-review.component').then(m => m.QuickAddReviewComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery-grid.component').then(m => m.GalleryGridComponent)
      },
      {
        path: 'timeline',
        loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./features/favorites/favorites.component').then(m => m.FavoritesComponent)
      },
      {
        path: 'collections',
        loadComponent: () => import('./features/collections/collections-list.component').then(m => m.CollectionsListComponent)
      },
      {
        path: 'collections/:id',
        loadComponent: () => import('./features/collections/collection-detail.component').then(m => m.CollectionDetailComponent)
      },
      {
        path: 'places',
        loadComponent: () => import('./features/places/places.component').then(m => m.PlacesComponent)
      },
      {
        path: 'map',
        loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent)
      },
      {
        path: 'people',
        loadComponent: () => import('./features/people/people.component').then(m => m.PeopleComponent)
      },
      {
        path: 'on-this-day',
        loadComponent: () => import('./features/on-this-day/on-this-day.component').then(m => m.OnThisDayComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications-list.component').then(m => m.NotificationsListComponent)
      },
      {
        path: 'assistant',
        loadComponent: () => import('./features/assistant/assistant.component').then(m => m.AssistantComponent)
      },
      {
        path: 'trash',
        loadComponent: () => import('./features/trash/trash.component').then(m => m.TrashComponent)
      },
      {
        path: 'guide',
        loadComponent: () => import('./features/guide/user-guide.component').then(m => m.UserGuideComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'admin/group',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
