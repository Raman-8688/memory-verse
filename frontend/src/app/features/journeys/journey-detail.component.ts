import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Journey, JourneySection } from '@core/models/journey.model';
import { JourneyService } from '@core/services/journey.service';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'mv-journey-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    @if (isLoading()) {
      <div class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Reliving this journey...</span>
      </div>
    } @else {
      @if (journey(); as j) {
        <div class="journey-detail-page">
          <!-- Back Navigation -->
          <a routerLink="/journeys" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            <span>All Journeys</span>
          </a>

          <!-- Hero Editorial Banner -->
          <div class="hero-banner">
            <img [src]="j.coverImageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80'" 
                 [alt]="j.title" 
                 class="hero-banner-img">
            <div class="banner-overlay"></div>
            
            <div class="banner-content">
              <div class="period-pill">
                <mat-icon>event</mat-icon>
                <span>{{ formatDateRange(j.startDate, j.endDate) }}</span>
              </div>

              <h1 class="hero-title">{{ j.title }}</h1>
              <p class="hero-desc">{{ j.description || 'Our shared adventures and precious memories.' }}</p>

              <div class="meta-row">
                <div class="creator-badge">
                  <img [src]="j.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'" 
                       [alt]="j.createdBy.fullName || 'Creator'" 
                       class="creator-avatar">
                  <span>Created by <strong>{{ j.createdBy.fullName || 'Friend' }}</strong></span>
                </div>

                <div class="stat-badge">
                  <mat-icon>bookmark_border</mat-icon>
                  <span>{{ j.sections.length }} {{ j.sections.length === 1 ? 'Chapter' : 'Chapters' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Chapters / Sections Timeline -->
          <div class="sections-section">
            <div class="sections-header">
              <div>
                <span class="sub-heading">Chronological Milestones</span>
                <h2 class="editorial-title">Chapters of this Journey</h2>
              </div>

              <button mat-button class="toggle-add-btn" (click)="showAddSectionForm.set(!showAddSectionForm())">
                <mat-icon>{{ showAddSectionForm() ? 'close' : 'add_circle_outline' }}</mat-icon>
                <span>{{ showAddSectionForm() ? 'Cancel' : 'Add Chapter' }}</span>
              </button>
            </div>

            <!-- Inline Add Chapter Box -->
            @if (showAddSectionForm()) {
              <div class="add-section-card">
                <h3 class="add-card-title">Add a New Chapter</h3>
                <form [formGroup]="sectionForm" (ngSubmit)="submitSection(j.id)" class="section-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-2">
                      <mat-label>Chapter Title</mat-label>
                      <input matInput formControlName="title" placeholder="e.g. Goa Graduation Trip">
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>Start Date</mat-label>
                      <input matInput formControlName="startDate" type="date">
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>End Date</mat-label>
                      <input matInput formControlName="endDate" type="date">
                    </mat-form-field>
                  </div>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Story / Description</mat-label>
                    <textarea matInput formControlName="description" rows="2" placeholder="What happened in this chapter?"></textarea>
                  </mat-form-field>

                  <div class="form-actions">
                    <button mat-flat-button class="save-chapter-btn" type="submit" [disabled]="sectionForm.invalid || isAddingSection()">
                      @if (isAddingSection()) {
                        <ng-container>
                          <mat-spinner diameter="18"></mat-spinner>
                          <span>Adding Chapter...</span>
                        </ng-container>
                      } @else {
                        <ng-container>
                          <mat-icon>check</mat-icon>
                          <span>Save Chapter</span>
                        </ng-container>
                      }
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- Chapters Timeline Feed -->
            <div class="timeline-container">
              @for (section of j.sections; track section.id; let i = $index) {
                <div class="timeline-step">
                  <div class="step-marker">
                    <span class="step-index">{{ i + 1 }}</span>
                    <div class="step-line"></div>
                  </div>

                  <div class="step-content-card">
                    <div class="step-header">
                      <h3 class="step-title">{{ section.title }}</h3>
                      @if (section.startDate || section.endDate) {
                        <span class="step-date">
                          <mat-icon>schedule</mat-icon>
                          {{ formatSectionDate(section.startDate, section.endDate) }}
                        </span>
                      }
                    </div>

                    <p class="step-desc">
                      {{ section.description || 'Memories and shared experiences in this chapter.' }}
                    </p>

                    <div class="step-actions">
                      <a [routerLink]="['/memories']" [queryParams]="{ journeyId: j.id, sectionId: section.id }" class="view-memories-link">
                        <mat-icon>photo_library</mat-icon>
                        <span>View memories in this chapter</span>
                        <mat-icon class="arrow-mini">arrow_forward</mat-icon>
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>error_outline</mat-icon>
          <h2>Journey Not Found</h2>
          <p>The journey you're looking for might have been moved or removed.</p>
          <a mat-flat-button color="primary" routerLink="/journeys">Back to Journeys</a>
        </div>
      }
    }
  `,
  styles: [`
    .journey-detail-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--mv-text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: color 0.2s;
      width: fit-content;
    }

    .back-link:hover {
      color: var(--mv-primary);
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .hero-banner {
      position: relative;
      width: 100%;
      min-height: 380px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: var(--space-6);
      box-shadow: var(--shadow-card);
    }

    .hero-banner-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .banner-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(28, 25, 23, 0.2) 0%, rgba(28, 25, 23, 0.85) 90%);
    }

    .banner-content {
      position: relative;
      z-index: 10;
      max-width: 800px;
      color: #ffffff;
    }

    .period-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: var(--space-2);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .period-pill mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .hero-title {
      font-family: var(--font-editorial);
      font-size: 3rem;
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 var(--space-2) 0;
      letter-spacing: -0.02em;
    }

    .hero-desc {
      font-size: 1.05rem;
      line-height: 1.6;
      color: #e7e5e4;
      margin: 0 0 var(--space-3) 0;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .creator-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #d6d3d1;
    }

    .creator-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #ffffff;
    }

    .stat-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: #d6d3d1;
    }

    .stat-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .sections-section {
      margin-top: var(--space-4);
    }

    .sections-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--mv-border);
    }

    .sub-heading {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2rem;
      margin: 2px 0 0 0;
    }

    .toggle-add-btn {
      color: var(--mv-primary) !important;
      font-weight: 600;
    }

    .add-section-card {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      padding: var(--space-3);
      margin-bottom: var(--space-4);
      box-shadow: var(--shadow-card);
    }

    .add-card-title {
      font-family: var(--font-editorial);
      font-size: 1.3rem;
      margin: 0 0 var(--space-2) 0;
      color: var(--mv-text-primary);
    }

    .form-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .flex-2 {
      flex: 2;
    }

    .flex-1 {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
    }

    .save-chapter-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
    }

    .timeline-container {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .timeline-step {
      display: flex;
      gap: var(--space-3);
      position: relative;
    }

    .step-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 36px;
    }

    .step-index {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      border: 2px solid var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      z-index: 2;
    }

    .step-line {
      flex: 1;
      width: 2px;
      background-color: var(--mv-border);
      margin: 4px 0;
      min-height: 40px;
    }

    .timeline-step:last-child .step-line {
      display: none;
    }

    .step-content-card {
      flex: 1;
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .step-content-card:hover {
      box-shadow: var(--shadow-card);
      border-color: var(--mv-border-focus);
    }

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .step-title {
      font-family: var(--font-editorial);
      font-size: 1.35rem;
      font-weight: 600;
      margin: 0;
      color: var(--mv-text-primary);
    }

    .step-date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      color: var(--mv-text-muted);
      font-weight: 500;
    }

    .step-date mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .step-desc {
      color: var(--mv-text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0 0 var(--space-2) 0;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--mv-border);
      padding-top: 8px;
    }

    .view-memories-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-decoration: none;
      transition: gap 0.2s;
    }

    .view-memories-link:hover {
      gap: 10px;
    }

    .view-memories-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .loading-state, .empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.2rem;
      }
      .form-row {
        flex-direction: column;
      }
    }
  `]
})
export class JourneyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly journeyService = inject(JourneyService);
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly journey = signal<Journey | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly showAddSectionForm = signal<boolean>(false);
  readonly isAddingSection = signal<boolean>(false);

  readonly sectionForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    startDate: [''],
    endDate: ['']
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadJourney(id);
      }
    });
  }

  loadJourney(id: string): void {
    this.isLoading.set(true);
    this.journeyService.getJourneyById(id).subscribe({
      next: (data) => {
        this.journey.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load journey details:', err);
        this.isLoading.set(false);
      }
    });
  }

  submitSection(journeyId: string): void {
    if (this.sectionForm.invalid || this.isAddingSection()) return;

    this.isAddingSection.set(true);
    this.journeyService.addSection(journeyId, this.sectionForm.value).subscribe({
      next: (newSection) => {
        this.isAddingSection.set(false);
        this.sectionForm.reset();
        this.showAddSectionForm.set(false);
        // Refresh journey details to show the new chapter
        this.loadJourney(journeyId);
      },
      error: (err) => {
        this.isAddingSection.set(false);
        console.error('Failed to add section:', err);
      }
    });
  }

  formatDateRange(start?: string, end?: string): string {
    if (!start && !end) return 'Ongoing Journey';
    const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
    return `${s} — ${e}`;
  }

  formatSectionDate(start?: string, end?: string): string {
    if (!start && !end) return '';
    const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
    return s && e ? `${s} to ${e}` : (s || e);
  }
}
