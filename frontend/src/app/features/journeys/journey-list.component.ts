import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { Journey } from '@core/models/journey.model';
import { JourneyService } from '@core/services/journey.service';
import { AuthService } from '@core/auth/auth.service';
import { JourneyFormDialogComponent } from './journey-form-dialog.component';

@Component({
  selector: 'mv-journey-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  template: `
    <div class="journeys-page">
      <!-- Page Header -->
      <div class="header-section">
        <div class="header-title-group">
          <span class="sub-heading">Chapters & Milestones</span>
          <h1 class="editorial-title">Our Shared Journeys</h1>
          <p class="header-desc">
            Organized periods of our lives together — from college corridors to road trips and everything in between.
          </p>
        </div>

        <button mat-flat-button class="create-journey-btn" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <span>New Journey</span>
        </button>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Loading our journeys...</span>
        </div>
      } @else if (journeys().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>auto_stories</mat-icon>
          </div>
          <h3 class="editorial-title">No Journeys Recorded Yet</h3>
          <p>Begin our story by creating the very first chapter of our shared journey.</p>
          <button mat-flat-button class="create-journey-btn" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            <span>Create First Journey</span>
          </button>
        </div>
      } @else {
        <!-- Rich Editorial Journey Cards Grid -->
        <div class="journeys-grid">
          @for (journey of journeys(); track journey.id) {
            <article class="journey-card" [routerLink]="['/journeys', journey.id]">
              <div class="card-media">
                <img [src]="journey.coverImageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'" 
                     [alt]="journey.title" 
                     loading="lazy" 
                     mvFallback
                     class="card-img">
                <div class="media-overlay"></div>
                <div class="card-badges">
                  <span class="badge-period">
                    <mat-icon class="badge-icon">calendar_today</mat-icon>
                    {{ formatDateRange(journey.startDate, journey.endDate) }}
                  </span>
                  <span class="badge-sections">
                    <mat-icon class="badge-icon">bookmark_border</mat-icon>
                    {{ journey.sections.length }} {{ journey.sections.length === 1 ? 'Chapter' : 'Chapters' }}
                  </span>
                </div>
              </div>

              <div class="card-content">
                <h2 class="card-title">{{ journey.title }}</h2>
                <p class="card-desc">{{ journey.description || 'A memorable period in our shared lives.' }}</p>

                <!-- Footer with Creator and Action Link -->
                <div class="card-footer">
                  <div class="creator-badge">
                    <img [src]="journey.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'" 
                         [alt]="journey.createdBy.fullName || 'Member'" 
                         mvFallback
                         class="creator-avatar">
                    <span class="creator-name">{{ journey.createdBy.fullName || 'Member' }}</span>
                  </div>

                  <span class="explore-link">
                    <span>Explore</span>
                    <mat-icon>arrow_forward</mat-icon>
                  </span>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .journeys-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .sub-heading {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.4rem;
      margin: 4px 0 8px 0;
      line-height: 1.1;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.95rem;
      max-width: 600px;
      margin: 0;
      line-height: 1.5;
    }

    .create-journey-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      border-radius: var(--radius-md);
      padding: 0 20px;
      height: 44px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(180, 83, 9, 0.25);
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-8) var(--space-4);
      gap: 16px;
      text-align: center;
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .empty-state p {
      color: var(--mv-text-secondary);
      max-width: 400px;
      margin-bottom: var(--space-2);
    }

    .journeys-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: var(--space-4);
    }

    .journey-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-card);
      text-decoration: none;
      color: inherit;
    }

    .journey-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: var(--mv-border-focus);
    }

    .card-media {
      position: relative;
      width: 100%;
      height: 220px;
      background-color: #e7e5e4;
      overflow: hidden;
    }

    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .journey-card:hover .card-img {
      transform: scale(1.04);
    }

    .media-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%);
    }

    .card-badges {
      position: absolute;
      bottom: 12px;
      left: 14px;
      right: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .badge-period, .badge-sections {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(8px);
      color: #ffffff;
      background: rgba(28, 25, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .badge-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .card-content {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .card-title {
      font-family: var(--font-editorial);
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--mv-text-primary);
      line-height: 1.3;
    }

    .card-desc {
      color: var(--mv-text-secondary);
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 var(--space-3) 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--mv-border);
    }

    .creator-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .creator-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .creator-name {
      font-size: 0.8rem;
      color: var(--mv-text-muted);
      font-weight: 500;
    }

    .explore-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--mv-primary);
      transition: gap 0.2s;
    }

    .journey-card:hover .explore-link {
      gap: 8px;
    }

    .explore-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    @media (max-width: 640px) {
      .journeys-grid {
        grid-template-columns: 1fr;
      }
      .editorial-title {
        font-size: 1.8rem;
      }
    }
  `]
})
export class JourneyListComponent implements OnInit {
  private readonly journeyService = inject(JourneyService);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadJourneys();
  }

  loadJourneys(): void {
    this.isLoading.set(true);
    this.journeyService.getJourneys().subscribe({
      next: (data) => {
        this.journeys.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load journeys:', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(JourneyFormDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((newJourney: Journey | undefined) => {
      if (newJourney) {
        this.loadJourneys();
      }
    });
  }

  formatDateRange(start?: string, end?: string): string {
    if (!start && !end) return 'Ongoing';
    const startYear = start ? new Date(start).getFullYear() : '';
    const endYear = end ? new Date(end).getFullYear() : 'Present';
    return startYear ? `${startYear} — ${endYear}` : `Until ${endYear}`;
  }
}
