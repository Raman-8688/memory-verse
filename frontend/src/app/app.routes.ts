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
        redirectTo: 'journeys',
        pathMatch: 'full'
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
        path: 'dashboard',
        redirectTo: 'journeys',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'journeys'
  }
];
