import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { JourneyEditDialogComponent } from './journey-edit-dialog.component';
import { ChapterEditDialogComponent } from './chapter-edit-dialog.component';
import { MediaViewerModalComponent } from '@shared/components/media-viewer-modal.component';
import { Journey, JourneySection } from '@core/models/journey.model';
import { JourneyService } from '@core/services/journey.service';
import { MediaService } from '@core/services/media.service';
import { ShareService } from '@core/services/share.service';
import { AuthService } from '@core/auth/auth.service';
import { NotificationStateService } from '@core/services/notification-state.service';

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
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ImageFallbackDirective
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
                 mvFallback
                 (click)="viewCoverFullscreen(j)"
                 class="hero-banner-img clickable-cover"
                 title="Click to view full cover photo">
            <div class="banner-overlay" (click)="viewCoverFullscreen(j)"></div>
            
            <div class="banner-content">
              <!-- Top Row: Date Pill Only (No Edit Button obstructing faces) -->
              <div class="banner-top-actions">
                <div class="period-pill">
                  <mat-icon>event</mat-icon>
                  <span>{{ formatDateRange(j.startDate, j.endDate) }}</span>
                </div>
              </div>

              <h1 class="hero-title">{{ j.title }}</h1>
              <p class="hero-desc">{{ j.description || 'Our shared adventures and precious memories.' }}</p>

              <!-- Bottom Meta Row: Author, Chapters, and Edit / View Actions at the Bottom -->
              <div class="meta-row">
                <div class="creator-badge">
                  <img [src]="j.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'" 
                       [alt]="j.createdBy.fullName || 'Creator'" 
                       mvFallback
                       class="creator-avatar">
                  <span>Created by <strong>{{ j.createdBy.fullName || 'Friend' }}</strong></span>
                </div>

                <div class="stat-badge">
                  <mat-icon>bookmark_border</mat-icon>
                  <span>{{ j.sections.length }} {{ j.sections.length === 1 ? 'Chapter' : 'Chapters' }}</span>
                </div>

                <div class="meta-spacer"></div>

                <!-- Play Storybook Presentation Mode -->
                <button mat-flat-button class="storybook-hero-btn" (click)="openStorybook(j)" title="Play full-screen storybook">
                  <mat-icon>auto_stories</mat-icon>
                  <span>Play Storybook</span>
                </button>

                <!-- View Full Photo Button -->
                <button mat-stroked-button class="view-cover-btn" (click)="viewCoverFullscreen(j)">
                  <mat-icon>fullscreen</mat-icon>
                  <span>View Photo</span>
                </button>

                <!-- Share Public Link -->
                <button mat-stroked-button class="view-cover-btn" (click)="shareJourney(j)" [disabled]="isSharing()" title="Generate public link">
                  @if (isSharing()) {
                    <mat-spinner diameter="14" class="white-spinner"></mat-spinner>
                  } @else {
                    <mat-icon>share</mat-icon>
                  }
                  <span>Share</span>
                </button>

                <!-- Export Keepsake Book -->
                <button mat-stroked-button class="view-cover-btn" [matMenuTriggerFor]="journeyExportMenu" title="Export keepsake">
                  <mat-icon>menu_book</mat-icon>
                  <span>Keepsake</span>
                </button>
                <mat-menu #journeyExportMenu="matMenu">
                  <button mat-menu-item (click)="exportJourneyBook(j)">
                    <mat-icon>print</mat-icon>
                    <span>Print Anthology Book (PDF)</span>
                  </button>
                  <button mat-menu-item (click)="downloadJourneyZip(j)">
                    <mat-icon>inventory_2</mat-icon>
                    <span>Download Full Archive (ZIP)</span>
                  </button>
                </mat-menu>

                <!-- Edit Journey (Neatly positioned at the bottom side) -->
                @if (canEdit()) {
                  <button mat-flat-button class="edit-hero-btn-bottom" (click)="openEditDialog(j)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit Journey</span>
                  </button>
                }
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

            <!-- Inline Add Chapter Box with Image Upload -->
            @if (showAddSectionForm()) {
              <div class="add-section-card">
                <h3 class="add-card-title">Add a New Chapter</h3>
                <form [formGroup]="sectionForm" (ngSubmit)="submitSection(j.id)" class="section-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-2">
                      <mat-label>Chapter Title *</mat-label>
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

                  <!-- Chapter Cover Image Selection -->
                  <div class="chapter-img-upload-row">
                    <input #chapterFileInput 
                           type="file" 
                           accept="image/*" 
                           (change)="onNewChapterFileSelected($event)" 
                           style="display: none;">

                    @if (newChapterImagePreview()) {
                      <div class="new-chapter-preview-wrap">
                        <img [src]="newChapterImagePreview()" alt="Chapter preview" class="new-chapter-preview-img">
                        <button type="button" mat-stroked-button class="change-new-img-btn" (click)="chapterFileInput.click()">
                          <mat-icon>photo_camera</mat-icon>
                          <span>Change Photo</span>
                        </button>
                        <button type="button" mat-icon-button class="remove-new-img-btn" (click)="clearNewChapterImage($event)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <div class="chapter-upload-trigger" (click)="chapterFileInput.click()">
                        <mat-icon>add_photo_alternate</mat-icon>
                        <div class="trigger-text">
                          <strong>Add Chapter Cover Photo</strong>
                          <span>Choose a photo from your computer or phone</span>
                        </div>
                      </div>
                    }
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
                          <span>Saving Chapter...</span>
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

            <!-- Chapters Timeline Feed with Rich Media Thumbnails & Edit Option -->
            <div class="timeline-container">
              @for (section of j.sections; track section.id; let i = $index) {
                <div class="timeline-step">
                  <div class="step-marker">
                    <span class="step-index">{{ i + 1 }}</span>
                    <div class="step-line"></div>
                  </div>

                  <div class="step-content-card">
                    <div class="step-card-layout">
                      <!-- Chapter Cover Image Thumbnail -->
                      @if (section.imageUrl) {
                        <div class="chapter-thumbnail-wrap" (click)="viewChapterFullscreen(section)" title="Click to view chapter photo">
                          <img [src]="section.imageUrl" 
                               [alt]="section.title" 
                               mvFallback 
                               class="chapter-thumbnail-img">
                          <div class="thumbnail-hover-badge">
                            <mat-icon>fullscreen</mat-icon>
                          </div>
                        </div>
                      } @else if (canEdit()) {
                        <div class="chapter-thumbnail-placeholder" (click)="openEditChapterDialog(section)" title="Add a cover photo for this chapter">
                          <mat-icon>add_photo_alternate</mat-icon>
                          <span>Add Photo</span>
                        </div>
                      }

                      <!-- Chapter Info & Actions -->
                      <div class="chapter-text-col">
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
                          @if (canEdit()) {
                            <button mat-button class="edit-chapter-btn" (click)="openEditChapterDialog(section)">
                              <mat-icon>edit</mat-icon>
                              <span>Edit Chapter</span>
                            </button>
                          }

                          <a [routerLink]="['/memories']" [queryParams]="{ journeyId: j.id, sectionId: section.id }" class="view-memories-link">
                            <mat-icon>photo_library</mat-icon>
                            <span>View memories in this chapter</span>
                            <mat-icon class="arrow-mini">arrow_forward</mat-icon>
                          </a>
                        </div>
                      </div>
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

    /* Hero Banner */
    .hero-banner {
      position: relative;
      width: 100%;
      min-height: 400px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: var(--space-6);
      box-shadow: var(--shadow-card);
    }

    .clickable-cover {
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .hero-banner:hover .hero-banner-img {
      transform: scale(1.015);
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
      background: linear-gradient(180deg, rgba(28, 25, 23, 0.15) 0%, rgba(28, 25, 23, 0.85) 90%);
      cursor: pointer;
    }

    .banner-content {
      position: relative;
      z-index: 10;
      width: 100%;
      color: #ffffff;
    }

    .banner-top-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 8px;
    }

    .period-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      background: rgba(28, 25, 23, 0.55);
      backdrop-filter: blur(8px);
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: var(--space-2);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .period-pill mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .hero-title {
      font-family: var(--font-editorial);
      font-size: 3.2rem;
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 var(--space-2) 0;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .hero-desc {
      font-size: 1.08rem;
      line-height: 1.6;
      color: #f5f5f4;
      margin: 0 0 var(--space-4) 0;
      max-width: 820px;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: var(--space-3);
    }

    .creator-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #e7e5e4;
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
      color: #e7e5e4;
    }

    .stat-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .meta-spacer {
      flex: 1;
    }

    .storybook-hero-btn {
      background: linear-gradient(135deg, var(--mv-primary), #d97706) !important;
      color: #ffffff !important;
      border-radius: var(--radius-full) !important;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px !important;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
      transition: all 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(217, 119, 6, 0.45);
      }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .view-cover-btn {
      background: rgba(28, 25, 23, 0.55) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      backdrop-filter: blur(8px);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 36px;
      transition: all 0.2s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: #ffffff !important;
      }
    }

    .edit-hero-btn-bottom {
      background: var(--mv-primary) !important;
      color: #ffffff !important;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 600;
      box-shadow: var(--shadow-sm);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      transition: all 0.2s ease;
      &:hover {
        background: #92400e !important;
        transform: translateY(-1px);
      }
    }

    /* Sections / Chapters */
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Add Section Card */
    .add-section-card {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      margin-bottom: var(--space-4);
      box-shadow: var(--shadow-card);
    }

    .add-card-title {
      font-family: var(--font-editorial);
      font-size: 1.4rem;
      margin: 0 0 var(--space-3) 0;
      color: var(--mv-text-primary);
    }

    .chapter-img-upload-row {
      margin-bottom: 16px;
    }

    .chapter-upload-trigger {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: #fef9ee;
      border: 2px dashed #fde68a;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--mv-text-primary);
      &:hover {
        border-color: var(--mv-primary);
        background: #fef3c7;
      }
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--mv-primary);
      }
    }

    .trigger-text {
      display: flex;
      flex-direction: column;
      strong {
        font-size: 0.9rem;
      }
      span {
        font-size: 0.76rem;
        color: var(--mv-text-muted);
      }
    }

    .new-chapter-preview-wrap {
      position: relative;
      height: 140px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .new-chapter-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .change-new-img-btn {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9) !important;
      color: var(--mv-text-primary) !important;
      font-size: 0.78rem !important;
      font-weight: 600;
      height: 32px !important;
    }

    .remove-new-img-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.6) !important;
      color: #ffffff !important;
      width: 28px !important;
      height: 28px !important;
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Timeline Steps */
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
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      margin-bottom: var(--space-4);
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .step-content-card:hover {
      box-shadow: var(--shadow-card);
      border-color: var(--mv-border-focus);
    }

    .step-card-layout {
      display: flex;
      gap: var(--space-4);
      align-items: stretch;
    }

    /* Chapter Thumbnail Media */
    .chapter-thumbnail-wrap {
      position: relative;
      width: 170px;
      min-height: 120px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      cursor: pointer;
      flex-shrink: 0;
      background: #1c1917;
      &:hover .thumbnail-hover-badge {
        opacity: 1;
      }
      &:hover .chapter-thumbnail-img {
        transform: scale(1.05);
      }
    }

    .chapter-thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .thumbnail-hover-badge {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      color: #ffffff;
      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    .chapter-thumbnail-placeholder {
      width: 140px;
      min-height: 110px;
      border-radius: var(--radius-md);
      border: 2px dashed #fde68a;
      background: #fef9ee;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease;
      color: var(--mv-primary);
      &:hover {
        background: #fef3c7;
        border-color: var(--mv-primary);
      }
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
      span {
        font-size: 0.75rem;
        font-weight: 600;
      }
    }

    .chapter-text-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
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
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0 0 var(--space-3) 0;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--mv-border);
      padding-top: 10px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .edit-chapter-btn {
      color: var(--mv-text-secondary) !important;
      font-size: 0.8rem !important;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px !important;
      height: 32px !important;
      border-radius: var(--radius-md) !important;
      &:hover {
        color: var(--mv-primary) !important;
        background: #fef3c7;
      }
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .view-memories-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-decoration: none;
      margin-left: auto;
      transition: gap 0.2s;
      &:hover {
        gap: 10px;
      }
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
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
      .meta-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .meta-spacer {
        display: none;
      }
      .step-card-layout {
        flex-direction: column;
      }
      .chapter-thumbnail-wrap {
        width: 100%;
        height: 160px;
      }
      .chapter-thumbnail-placeholder {
        width: 100%;
        min-height: 80px;
      }
      .form-row {
        flex-direction: column;
      }
    }
  `]
})
export class JourneyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journeyService = inject(JourneyService);
  private readonly mediaService = inject(MediaService);
  private readonly shareService = inject(ShareService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly notificationState = inject(NotificationStateService);
  readonly authService = inject(AuthService);

  openStorybook(j: Journey): void {
    this.router.navigate(['/journeys', j.id, 'storybook']);
  }

  readonly journey = signal<Journey | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly showAddSectionForm = signal<boolean>(false);
  readonly isAddingSection = signal<boolean>(false);
  readonly isSharing = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // New chapter image file and preview
  readonly newChapterImagePreview = signal<string | null>(null);
  selectedChapterFile: File | null = null;

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

  onNewChapterFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedChapterFile = file;
    this.newChapterImagePreview.set(URL.createObjectURL(file));
    input.value = '';
  }

  clearNewChapterImage(event: Event): void {
    event.stopPropagation();
    this.selectedChapterFile = null;
    this.newChapterImagePreview.set(null);
  }

  submitSection(journeyId: string): void {
    if (this.sectionForm.invalid || this.isAddingSection()) return;

    this.isAddingSection.set(true);
    const formVal = this.sectionForm.value;

    const executeAdd = (imageUrl: string | null) => {
      const payload = {
        title: formVal.title.trim(),
        description: formVal.description?.trim() || '',
        startDate: formVal.startDate || undefined,
        endDate: formVal.endDate || undefined,
        imageUrl: imageUrl || undefined
      };

      this.journeyService.addSection(journeyId, payload).subscribe({
        next: () => {
          this.isAddingSection.set(false);
          this.sectionForm.reset();
          this.selectedChapterFile = null;
          this.newChapterImagePreview.set(null);
          this.showAddSectionForm.set(false);
          this.notificationState.refresh();
          this.snackBar.open('Chapter added successfully!', 'OK', { duration: 3000 });
          this.loadJourney(journeyId);
        },
        error: (err) => {
          this.isAddingSection.set(false);
          console.error('Failed to add chapter:', err);
          this.snackBar.open('Failed to add chapter. Please try again.', 'Close', { duration: 4000 });
        }
      });
    };

    if (this.selectedChapterFile) {
      this.mediaService.uploadSingleFile(this.selectedChapterFile).subscribe({
        next: (res) => {
          executeAdd(res.mediaUrl);
        },
        error: (err) => {
          this.isAddingSection.set(false);
          console.error('Failed to upload chapter cover:', err);
          this.snackBar.open('Failed to upload chapter photo.', 'Close', { duration: 4000 });
        }
      });
    } else {
      executeAdd(null);
    }
  }

  viewCoverFullscreen(j: Journey): void {
    if (!j.coverImageUrl) return;

    this.dialog.open(MediaViewerModalComponent, {
      data: {
        items: [{
          id: j.id,
          mediaUrl: j.coverImageUrl,
          thumbnailUrl: j.coverImageUrl,
          mediaType: 'IMAGE',
          memoryTitle: j.title,
          journeyTitle: j.title,
          memoryDate: j.startDate,
          uploader: j.createdBy
        }],
        startIndex: 0
      },
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
    });
  }

  viewChapterFullscreen(section: JourneySection): void {
    if (!section.imageUrl) return;

    const j = this.journey();
    this.dialog.open(MediaViewerModalComponent, {
      data: {
        items: [{
          id: section.id,
          mediaUrl: section.imageUrl,
          thumbnailUrl: section.imageUrl,
          mediaType: 'IMAGE',
          memoryTitle: section.title,
          journeyTitle: j ? j.title : undefined,
          memoryDate: section.startDate,
          uploader: j ? j.createdBy : undefined
        }],
        startIndex: 0
      },
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
    });
  }

  openEditChapterDialog(section: JourneySection): void {
    const j = this.journey();
    if (!j) return;

    const ref = this.dialog.open(ChapterEditDialogComponent, {
      data: {
        journeyId: j.id,
        section
      },
      width: '580px'
    });

    ref.afterClosed().subscribe((updated: JourneySection | undefined) => {
      if (updated) {
        this.journey.update(curr => {
          if (!curr) return null;
          const updatedSections = curr.sections.map(s => s.id === updated.id ? updated : s);
          return { ...curr, sections: updatedSections };
        });
        this.notificationState.refresh();
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

  canEdit(): boolean {
    const user = this.authService.currentUser();
    const j = this.journey();
    if (!user || !j) return false;
    return user.id === j.createdBy?.id || this.authService.isAdmin();
  }

  openEditDialog(j: Journey): void {
    const ref = this.dialog.open(JourneyEditDialogComponent, {
      data: j,
      width: '580px'
    });

    ref.afterClosed().subscribe((updated: Journey | undefined) => {
      if (updated) {
        this.journey.update(curr => curr ? { ...curr, ...updated, sections: curr.sections } : updated);
        this.notificationState.refresh();
      }
    });
  }

  // --- SHARE & EXPORT ACTIONS ---

  shareJourney(j: Journey): void {
    this.isSharing.set(true);
    this.shareService.createShareLink('JOURNEY', j.id).subscribe({
      next: (res) => {
        this.isSharing.set(false);
        const fullUrl = `${window.location.origin}${res.shareUrl}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
          this.snackBar.open('Public anthology link copied to clipboard!', 'Close', { duration: 4000 });
        }).catch(() => {
          this.snackBar.open(`Share link: ${fullUrl}`, 'Close', { duration: 6000 });
        });
      },
      error: () => {
        this.isSharing.set(false);
        this.snackBar.open('Failed to generate journey share link', 'Close', { duration: 3000 });
      }
    });
  }

  exportJourneyBook(j: Journey): void {
    window.open(this.shareService.getJourneyBookUrl(j.id), '_blank');
  }

  downloadJourneyZip(j: Journey): void {
    this.isExporting.set(true);
    this.snackBar.open('Packaging journey archive...', undefined, { duration: 2000 });
    this.shareService.downloadJourneyZip(j.id).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journey-${j.id}-keepsake.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Journey keepsake archive downloaded!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isExporting.set(false);
        this.snackBar.open('Failed to download journey archive', 'Close', { duration: 3000 });
      }
    });
  }
}
