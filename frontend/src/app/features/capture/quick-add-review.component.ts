import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { Journey, JourneySection } from '@core/models/journey.model';
import { MemoryCreateDto } from '@core/models/memory.model';
import { DesktopUploadDropzoneComponent } from './desktop-upload-dropzone.component';

interface PreviewItem {
  file: File;
  previewUrl: string;
  isVideo: boolean;
  name: string;
  sizeFormatted: string;
}

@Component({
  selector: 'mv-quick-add-review',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DesktopUploadDropzoneComponent
  ],
  template: `
    <div class="review-page">
      <!-- Header -->
      <header class="review-header">
        <div class="header-content">
          <span class="sub-label">Smart Media Capture</span>
          <h1 class="editorial-title">Review & Publish Moment</h1>
          <p class="header-desc">
            Review your captured media, select the journey chapter, and record your story.
          </p>
        </div>
      </header>

      <div class="review-layout">
        <!-- Left Panel: Media Previews & Dropzone -->
        <section class="media-preview-section">
          <div class="section-title-row">
            <h3 class="section-heading">
              <mat-icon>collections</mat-icon>
              <span>Captured Assets ({{ previews().length }})</span>
            </h3>
            <button mat-stroked-button class="add-more-btn" (click)="triggerCapture()" [disabled]="isUploading()">
              <mat-icon>add_photo_alternate</mat-icon>
              <span>Add More</span>
            </button>
          </div>

          @if (previews().length === 0) {
            <!-- Empty state: show dropzone to select files -->
            <div class="empty-dropzone-wrap">
              <mv-desktop-upload-dropzone (filesSelected)="onFilesAdded($event)"></mv-desktop-upload-dropzone>
            </div>
          } @else {
            <!-- Previews Grid / Rail -->
            <div class="previews-rail">
              @for (item of previews(); track item.file.name; let i = $index) {
                <div class="preview-card">
                  <div class="preview-media-frame">
                    @if (item.isVideo) {
                      <video [src]="item.previewUrl" class="preview-thumb video-thumb" muted></video>
                      <div class="media-type-badge video">
                        <mat-icon>videocam</mat-icon>
                        <span>Video</span>
                      </div>
                    } @else {
                      <img [src]="item.previewUrl" [alt]="item.name" class="preview-thumb" />
                      <div class="media-type-badge image">
                        <mat-icon>photo_camera</mat-icon>
                        <span>Photo</span>
                      </div>
                    }

                    <!-- Remove Action Button -->
                    <button
                      mat-icon-button
                      class="remove-btn"
                      (click)="removeFile(i)"
                      [disabled]="isUploading()"
                      title="Remove asset"
                      aria-label="Remove asset"
                    >
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>

                  <div class="preview-info">
                    <span class="file-name" [title]="item.name">{{ item.name }}</span>
                    <span class="file-size">{{ item.sizeFormatted }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Right Panel: Metadata Form & Publishing Console -->
        <section class="form-section">
          <form [formGroup]="reviewForm" (ngSubmit)="publishMemory()" class="metadata-form">
            <h3 class="section-heading form-heading">
              <mat-icon>auto_stories</mat-icon>
              <span>Memory Details</span>
            </h3>

            <!-- Memory Title -->
            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>Memory Title *</mat-label>
              <input matInput formControlName="title" placeholder="e.g. Sunset at Hostel Terrace, Farewell Gala" />
              @if (reviewForm.get('title')?.hasError('required') && reviewForm.get('title')?.touched) {
                <mat-error>A title is required to preserve this memory.</mat-error>
              }
            </mat-form-field>

            <!-- Journey & Section Selectors Row -->
            <div class="form-row">
              <!-- Journey Selector -->
              <mat-form-field appearance="outline" class="form-field half-width">
                <mat-label>Journey *</mat-label>
                <mat-select formControlName="journeyId" (selectionChange)="onJourneyChange($event.value)">
                  @for (j of journeys(); track j.id) {
                    <mat-option [value]="j.id">{{ j.title }}</mat-option>
                  }
                </mat-select>
                @if (reviewForm.get('journeyId')?.hasError('required') && reviewForm.get('journeyId')?.touched) {
                  <mat-error>Please choose a destination journey.</mat-error>
                }
              </mat-form-field>

              <!-- Chapter/Section Selector -->
              <mat-form-field appearance="outline" class="form-field half-width">
                <mat-label>Chapter / Section *</mat-label>
                <mat-select formControlName="sectionId" [disabled]="!availableSections().length">
                  @for (sec of availableSections(); track sec.id) {
                    <mat-option [value]="sec.id">{{ sec.title }}</mat-option>
                  }
                </mat-select>
                @if (reviewForm.get('sectionId')?.hasError('required') && reviewForm.get('sectionId')?.touched) {
                  <mat-error>Select a chapter.</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Date & Location Row -->
            <div class="form-row">
              <!-- Datepicker -->
              <mat-form-field appearance="outline" class="form-field half-width">
                <mat-label>Date of Memory *</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="memoryDate" />
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <!-- Named Location -->
              <mat-form-field appearance="outline" class="form-field half-width">
                <mat-label>Location</mat-label>
                <input matInput formControlName="locationName" placeholder="e.g. Auditorium, Goa Beach" />
              </mat-form-field>
            </div>

            <!-- Emotional Story / Description -->
            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>The Story / Notes</mat-label>
              <textarea matInput formControlName="story" rows="4" placeholder="What made this moment special? Who was laughing the hardest?"></textarea>
            </mat-form-field>

            <!-- Upload Progress Indicator -->
            @if (isUploading()) {
              <div class="upload-progress-box">
                <div class="progress-info">
                  <span class="progress-label">Uploading media to memory archive...</span>
                  <span class="progress-pct">{{ uploadProgress() }}%</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="uploadProgress()"></mat-progress-bar>
              </div>
            }

            <!-- Action Buttons -->
            <div class="form-actions">
              <button mat-button type="button" routerLink="/memories" [disabled]="isUploading()" class="cancel-btn">
                <span>Cancel</span>
              </button>

              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="reviewForm.invalid || previews().length === 0 || isUploading()"
                class="publish-btn"
              >
                @if (isUploading()) {
                  <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
                  <span>Publishing...</span>
                } @else {
                  <ng-container>
                    <mat-icon>check_circle</mat-icon>
                    <span>Publish Memory</span>
                  </ng-container>
                }
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .review-page {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .review-header {
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--mv-border);
    }

    .sub-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--mv-primary);
    }

    .editorial-title {
      font-size: 2.2rem;
      margin: 4px 0 6px;
      line-height: 1.15;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.45;
    }

    .review-layout {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: var(--space-6);
      align-items: start;
    }

    /* Left Section: Previews */
    .media-preview-section {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-heading {
      font-family: var(--font-editorial);
      font-size: 1.3rem;
      margin: 0;
      color: var(--mv-text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-heading mat-icon {
      color: var(--mv-primary);
    }

    .add-more-btn {
      border-radius: var(--radius-md);
      font-size: 0.82rem;
      color: var(--mv-primary);
      border-color: var(--mv-border);
    }

    .previews-rail {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      max-height: 480px;
      overflow-y: auto;
      padding: 4px;
    }

    .preview-card {
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .preview-media-frame {
      position: relative;
      aspect-ratio: 1;
      background-color: #1c1917;
    }

    .preview-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-type-badge {
      position: absolute;
      bottom: 6px;
      left: 6px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .media-type-badge.image {
      background-color: rgba(180, 83, 9, 0.85);
    }

    .media-type-badge.video {
      background-color: rgba(185, 28, 28, 0.85);
    }

    .media-type-badge mat-icon {
      font-size: 11px;
      width: 11px;
      height: 11px;
    }

    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 26px;
      height: 26px;
      line-height: 26px;
      background-color: rgba(0, 0, 0, 0.65);
      color: #ffffff;
      border-radius: 50%;
    }

    .remove-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .remove-btn:hover {
      background-color: #b91c1c;
    }

    .preview-info {
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .file-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--mv-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 0.68rem;
      color: var(--mv-text-muted);
    }

    /* Right Section: Form */
    .form-section {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      box-shadow: var(--shadow-card);
    }

    .metadata-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-heading {
      margin-bottom: var(--space-2);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1;
    }

    .upload-progress-box {
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mv-primary);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--mv-border);
    }

    .publish-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      border-radius: var(--radius-md);
      padding: 0 20px;
      height: 42px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .publish-btn:disabled {
      background-color: #e5e7eb !important;
      color: #9ca3af !important;
    }

    .cancel-btn {
      color: var(--mv-text-secondary);
    }

    .btn-spinner {
      margin-right: 6px;
    }

    @media (max-width: 860px) {
      .review-layout {
        grid-template-columns: 1fr;
      }
      .editorial-title {
        font-size: 1.75rem;
      }
      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `]
})
export class QuickAddReviewComponent implements OnInit, OnDestroy {
  readonly captureService = inject(MediaCaptureService);
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly journeys = signal<Journey[]>([]);
  readonly availableSections = signal<JourneySection[]>([]);
  readonly isUploading = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);

  // Array of local preview items
  readonly previews = signal<PreviewItem[]>([]);

  reviewForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    journeyId: ['', Validators.required],
    sectionId: ['', Validators.required],
    memoryDate: [new Date(), Validators.required],
    locationName: [''],
    story: ['']
  });

  ngOnInit(): void {
    this.loadJourneys();
    this.generatePreviews(this.captureService.capturedFiles());
  }

  ngOnDestroy(): void {
    // Revoke object URLs to avoid memory leaks
    this.previews().forEach(item => {
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  private loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (list) => {
        this.journeys.set(list);
        if (list.length > 0) {
          const first = list[0];
          this.reviewForm.patchValue({ journeyId: first.id });
          this.onJourneyChange(first.id);
        }
      },
      error: (err) => console.error('Failed to load journeys for review:', err)
    });
  }

  onJourneyChange(journeyId: string): void {
    const found = this.journeys().find(j => j.id === journeyId);
    if (found && (found as any).sections) {
      const secs = (found as any).sections as JourneySection[];
      this.availableSections.set(secs);
      if (secs.length > 0) {
        this.reviewForm.patchValue({ sectionId: secs[0].id });
      } else {
        this.reviewForm.patchValue({ sectionId: '' });
      }
    } else {
      this.availableSections.set([]);
      this.reviewForm.patchValue({ sectionId: '' });
    }
  }

  generatePreviews(files: File[]): void {
    const items: PreviewItem[] = files.map(file => {
      const isVideo = file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4');
      const previewUrl = URL.createObjectURL(file);
      return {
        file,
        previewUrl,
        isVideo,
        name: file.name,
        sizeFormatted: this.formatFileSize(file.size)
      };
    });
    this.previews.set(items);
  }

  removeFile(index: number): void {
    const current = this.previews();
    if (index >= 0 && index < current.length) {
      const removed = current[index];
      if (removed.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      const updated = current.filter((_, idx) => idx !== index);
      this.previews.set(updated);
      this.captureService.setCapturedFiles(updated.map(i => i.file));
    }
  }

  onFilesAdded(newFiles: File[]): void {
    if (newFiles && newFiles.length > 0) {
      const existingFiles = this.previews().map(p => p.file);
      const combined = [...existingFiles, ...newFiles];
      this.captureService.setCapturedFiles(combined);
      this.generatePreviews(combined);
    }
  }

  triggerCapture(): void {
    this.captureService.openCaptureFlow();
  }

  publishMemory(): void {
    if (this.reviewForm.invalid || this.previews().length === 0 || this.isUploading()) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const formVal = this.reviewForm.value;
    const rawDate = formVal.memoryDate instanceof Date
      ? formVal.memoryDate.toISOString().split('T')[0]
      : new Date(formVal.memoryDate).toISOString().split('T')[0];

    const dto: MemoryCreateDto = {
      title: formVal.title.trim(),
      story: formVal.story ? formVal.story.trim() : '',
      memoryDate: rawDate,
      locationName: formVal.locationName ? formVal.locationName.trim() : undefined,
      journeyId: formVal.journeyId,
      sectionId: formVal.sectionId || undefined
    };

    const filesToUpload = this.previews().map(p => p.file);

    this.isUploading.set(true);
    this.uploadProgress.set(5);

    // Call existing Spring Boot endpoint via MemoryService.createMemoryWithProgress
    this.memoryService.createMemoryWithProgress(dto, filesToUpload).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round(100 * event.loaded / event.total);
          this.uploadProgress.set(Math.min(pct, 95));
        } else if (event.type === HttpEventType.Response) {
          this.uploadProgress.set(100);
          this.isUploading.set(false);
          this.captureService.clearCapturedFiles();

          const createdMemory = event.body?.data;
          this.snackBar.open('Memory published successfully to your journey archive!', 'View', {
            duration: 4000
          }).onAction().subscribe(() => {
            if (createdMemory?.id) {
              this.router.navigate(['/memories', createdMemory.id]);
            }
          });

          if (createdMemory?.id) {
            this.router.navigate(['/memories', createdMemory.id]);
          } else {
            this.router.navigate(['/memories']);
          }
        }
      },
      error: (err: any) => {
        console.error('Memory publish failed:', err);
        this.isUploading.set(false);
        const errorMsg = err.error?.message || err.message || 'Failed to upload media. Please try again.';
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      }
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
