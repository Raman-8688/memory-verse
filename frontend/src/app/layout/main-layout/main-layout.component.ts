import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';

@Component({
  selector: 'mv-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, MobileNavComponent],
  template: `
    <div class="layout-container">
      <mv-navbar></mv-navbar>
      <div class="layout-body">
        <div class="desktop-sidebar-wrapper">
          <mv-sidebar></mv-sidebar>
        </div>
        <main class="layout-main-content route-fade-in">
          <router-outlet></router-outlet>
        </main>
      </div>
      <mv-mobile-nav></mv-mobile-nav>
    </div>
  `,
  styles: [`
    .layout-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--mv-bg-main);
    }

    .layout-body {
      display: flex;
      flex: 1;
    }

    .desktop-sidebar-wrapper {
      display: block;
    }

    .layout-main-content {
      flex: 1;
      padding: var(--mv-space-32) var(--mv-space-32) var(--mv-space-64);
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    @media (max-width: 1024px) {
      .desktop-sidebar-wrapper {
        display: none;
      }
      .layout-main-content {
        padding: var(--mv-space-16);
        padding-bottom: calc(72px + env(safe-area-inset-bottom, 16px)); /* Safe space for mobile bottom nav */
      }
    }
  `]
})
export class MainLayoutComponent {}
