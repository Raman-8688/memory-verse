import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MediaCaptureService } from '@core/services/media-capture.service';

@Component({
  selector: 'mv-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatBottomSheetModule],
  template: `
    <nav class="mobile-bottom-nav">
      <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="mobile-tab">
        <mat-icon>dashboard</mat-icon>
        <span>Home</span>
      </a>
      <a routerLink="/journeys" routerLinkActive="active" class="mobile-tab">
        <mat-icon>auto_stories</mat-icon>
        <span>Journeys</span>
      </a>
      <button type="button" class="mobile-tab center-action" (click)="openCapture()" aria-label="Quick Add Media">
        <div class="action-bubble">
          <mat-icon>photo_camera</mat-icon>
        </div>
        <span>Capture</span>
      </button>
      <a routerLink="/gallery" routerLinkActive="active" class="mobile-tab">
        <mat-icon>collections</mat-icon>
        <span>Gallery</span>
      </a>
      <a routerLink="/assistant" routerLinkActive="active" class="mobile-tab">
        <mat-icon>auto_awesome</mat-icon>
        <span>Assistant</span>
      </a>
      <a routerLink="/profile" routerLinkActive="active" class="mobile-tab">
        <mat-icon>person</mat-icon>
        <span>Profile</span>
      </a>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      padding-bottom: env(safe-area-inset-bottom, 0);
      background-color: var(--mv-bg-surface);
      border-top: 1px solid var(--mv-border);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 50;
      box-shadow: 0 -2px 10px rgba(28, 25, 23, 0.04);
    }

    .mobile-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      color: var(--mv-text-muted);
      font-size: 0.6875rem;
      font-weight: 500;
      gap: 2px;
      flex: 1;
      height: 100%;
      transition: color var(--mv-transition-fast);
    }

    .mobile-tab mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .mobile-tab.active {
      color: var(--mv-primary);
      font-weight: 600;
    }

    .center-action .action-bubble {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: var(--mv-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -14px;
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
      transition: transform var(--mv-transition-fast), background-color var(--mv-transition-fast);
    }

    .center-action:active .action-bubble {
      transform: scale(0.92);
      background-color: var(--mv-primary-hover);
    }

    .center-action .action-bubble mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .mobile-tab.center-action {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
    }

    @media (min-width: 1024px) {
      .mobile-bottom-nav {
        display: none;
      }
    }
  `]
})
export class MobileNavComponent {
  private readonly captureService = inject(MediaCaptureService);

  openCapture(): void {
    this.captureService.openCaptureFlow();
  }
}
