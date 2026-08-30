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
        <main class="layout-main-content">
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
      padding: var(--space-4);
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 1024px) {
      .desktop-sidebar-wrapper {
        display: none;
      }
      .layout-main-content {
        padding: var(--space-2);
        padding-bottom: 80px; /* Space for mobile nav bar */
      }
    }
  `]
})
export class MainLayoutComponent {}
