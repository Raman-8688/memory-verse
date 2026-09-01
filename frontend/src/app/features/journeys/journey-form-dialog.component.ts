import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JourneyService } from '@core/services/journey.service';
import { MediaService } from '@core/services/media.service';

@Component({
  selector: 'mv-journey-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div>
          <span class="dialog-subtitle">New Life Chapter</span>
          <h2 class="editorial-title">Create a Journey</h2>
        </div>
        <button mat-icon-button mat-dialog-close [disabled]="isSubmitting()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form" class="journey-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Journey Title</mat-label>
            <input matInput formControlName="title" placeholder="e.g. Master's Degree in Berlin or Goa Trip 2024">
            <mat-icon matPrefix class="field-icon">auto_stories</mat-icon>
            @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Story & Overview</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="What does this period mean to us? What were the highlights?"></textarea>
          </mat-form-field>

          <!-- Cover Artwork Upload Section (Device / Mobile Camera Pick) -->
          <div class="cover-upload-block">
            <label class="section-label">Cover Artwork</label>

            <!-- Hidden single file input -->
            <input 
              type="file" 
              #coverFileInput 
              accept="image/*" 
              (change)="onCoverFileSelected($event)" 
              style="display: none;" />

            @if (coverPreviewUrl()) {
              <div class="cover-preview-card">
                <img [src]="coverPreviewUrl()" alt="Cover preview" class="cover-preview-img" />
                <div class="preview-actions-overlay">
                  <button type="button" mat-flat-button class="overlay-btn change-btn" (click)="coverFileInput.click()" [disabled]="isSubmitting()">
                    <mat-icon>photo_camera</mat-icon>
                    <span>Change Photo</span>
                  </button>
                  <button type="button" mat-stroked-button class="overlay-btn remove-btn" (click)="removeCover()" [disabled]="isSubmitting()">
                    <mat-icon>delete</mat-icon>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            } @else {
              <div class="upload-dropzone" (click)="coverFileInput.click()">
                <div class="dropzone-icon">
                  <mat-icon>add_photo_alternate</mat-icon>
                </div>
                <div class="dropzone-text">
                  <strong>Select Cover Photo from Device</strong>
                  <span>Tap to choose from phone gallery, camera, or computer</span>
                </div>
              </div>
            }
          </div>

          <!-- Quick Curated Photo Inspiration -->
          <div class="preset-covers">
            <span class="preset-label">Or choose an editorial theme:</span>
            <div class="preset-pills">
              <button type="button" class="pill" (click)="setCover('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80')">Campus</button>
              <button type="button" class="pill" (click)="setCover('https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1200&q=80')">Road Trip</button>
              <button type="button" class="pill" (click)="setCover('https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80')">Reunion</button>
              <button type="button" class="pill" (click)="setCover('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')">Beach</button>
            </div>
          </div>

          <div class="two-col">
            <mat-form-field appearance="outline">
              <mat-label>Start Date</mat-label>
              <input matInput formControlName="startDate" type="date">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End Date</mat-label>
              <input matInput formControlName="endDate" type="date">
            </mat-form-field>
          </div>

          <!-- Nested Sections / Chapters -->
          <div class="sections-block">
            <div class="sections-header">
              <div class="sections-title">Journey Chapters & Sections</div>
              <button type="button" mat-button class="add-section-btn" (click)="addSectionField()">
                <mat-icon>add</mat-icon>
                <span>Add Chapter</span>
              </button>
            </div>

            <div formArrayName="sections" class="sections-list">
              @for (sec of sectionsFormArray.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="section-item">
                  <div class="section-row">
                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>Chapter Title</mat-label>
                      <input matInput formControlName="title" placeholder="e.g. First Year Fresher's">
                    </mat-form-field>
                    <button mat-icon-button color="warn" type="button" (click)="removeSectionField(i)" [disabled]="sectionsFormArray.length <= 1">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Chapter Description (Optional)</mat-label>
                    <input matInput formControlName="description" placeholder="Brief note about this chapter">
                  </mat-form-field>
                </div>
              }
            </div>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close [disabled]="isSubmitting()">Cancel</button>
        <button mat-flat-button class="save-btn" (click)="saveJourney()" [disabled]="form.invalid || isSubmitting()">
          @if (isSubmitting()) {
            <ng-container>
              <mat-spinner diameter="18"></mat-spinner>
              <span>Creating...</span>
            </ng-container>
          } @else {
            <ng-container>
              <mat-icon>check</mat-icon>
              <span>Create Journey</span>
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: var(--space-4);
      max-width: 580px;
      width: 100%;
      background: var(--mv-bg-surface);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-3);
    }

    .dialog-subtitle {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 1.8rem;
      margin: 2px 0 0 0;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 0;
    }

    .journey-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .full-width {
      width: 100%;
    }

    .field-icon {
      color: var(--mv-text-muted);
      margin-right: 8px;
    }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* Cover Upload Styles */
    .cover-upload-block {
      margin: 4px 0 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mv-text-secondary);
    }

    .upload-dropzone {
      border: 2px dashed #fde68a;
      background-color: #fef9ee;
      border-radius: var(--radius-md);
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-dropzone:hover {
      border-color: var(--mv-primary);
      background-color: #fef3c7;
      transform: translateY(-1px);
    }

    .dropzone-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: #ffffff;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-subtle);
      flex-shrink: 0;
    }

    .dropzone-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dropzone-text strong {
      font-size: 0.9rem;
      color: var(--mv-text-primary);
    }

    .dropzone-text span {
      font-size: 0.78rem;
      color: var(--mv-text-muted);
    }

    .cover-preview-card {
      position: relative;
      width: 100%;
      height: 150px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      box-shadow: var(--shadow-subtle);
      background-color: #1c1917;
    }

    .cover-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-actions-overlay {
      position: absolute;
      inset: 0;
      background: rgba(28, 25, 23, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      backdrop-filter: blur(2px);
    }

    .overlay-btn {
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 16px;
      height: 36px;
    }

    .change-btn {
      background-color: #ffffff !important;
      color: var(--mv-text-primary) !important;
    }

    .remove-btn {
      background-color: rgba(239, 68, 68, 0.9) !important;
      color: #ffffff !important;
      border: none !important;
    }

    .preset-covers {
      margin-top: 2px;
      margin-bottom: 8px;
    }

    .preset-label {
      font-size: 0.75rem;
      color: var(--mv-text-muted);
      display: block;
      margin-bottom: 6px;
    }

    .preset-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pill {
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.75rem;
      cursor: pointer;
      color: var(--mv-text-secondary);
      transition: all 0.2s;
    }

    .pill:hover {
      background-color: #fef3c7;
      border-color: var(--mv-primary);
      color: var(--mv-primary);
    }

    .sections-block {
      margin-top: var(--space-2);
      padding: var(--space-3);
      background-color: var(--mv-bg-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--mv-border);
    }

    .sections-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-2);
    }

    .sections-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--mv-text-primary);
    }

    .add-section-btn {
      color: var(--mv-primary) !important;
      font-size: 0.8rem;
    }

    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-item {
      background: var(--mv-bg-surface);
      padding: 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--mv-border);
    }

    .section-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .flex-1 {
      flex: 1;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: var(--space-3);
      border-top: 1px solid var(--mv-border);
      margin-top: var(--space-3);
    }

    .save-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
    }
  `]
})
export class JourneyFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly journeyService = inject(JourneyService);
  private readonly mediaService = inject(MediaService);
  private readonly dialogRef = inject(MatDialogRef<JourneyFormDialogComponent>);

  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly coverPreviewUrl = signal<string | null>(null);
  readonly selectedCoverFile = signal<File | null>(null);

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    startDate: [''],
    endDate: [''],
    displayOrder: [0],
    sections: this.fb.array([
      this.createSectionGroup('First Chapter', 1)
    ])
  });

  get sectionsFormArray(): FormArray {
    return this.form?.get('sections') as FormArray;
  }

  createSectionGroup(title = '', order?: number): FormGroup {
    const currentOrder = order !== undefined 
      ? order 
      : (this.form?.get('sections') ? (this.form.get('sections') as FormArray).length + 1 : 1);

    return this.fb.group({
      title: [title, Validators.required],
      description: [''],
      displayOrder: [currentOrder]
    });
  }

  addSectionField(): void {
    const nextOrder = this.sectionsFormArray ? this.sectionsFormArray.length + 1 : 1;
    this.sectionsFormArray.push(this.createSectionGroup('', nextOrder));
  }

  removeSectionField(index: number): void {
    if (this.sectionsFormArray.length > 1) {
      this.sectionsFormArray.removeAt(index);
    }
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedCoverFile.set(file);
    this.coverPreviewUrl.set(URL.createObjectURL(file));
    input.value = '';
  }

  setCover(url: string): void {
    this.selectedCoverFile.set(null);
    this.coverPreviewUrl.set(url);
  }

  removeCover(): void {
    this.selectedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
  }

  saveJourney(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const file = this.selectedCoverFile();
    if (file) {
      this.isUploadingCover.set(true);
      this.mediaService.uploadSingleFile(file).subscribe({
        next: (uploaded) => {
          this.isUploadingCover.set(false);
          this.executeCreate(uploaded.mediaUrl);
        },
        error: (err) => {
          this.isUploadingCover.set(false);
          this.isSubmitting.set(false);
          console.error('Failed to upload cover photo:', err);
        }
      });
    } else {
      this.executeCreate(this.coverPreviewUrl());
    }
  }

  private executeCreate(coverUrl: string | null): void {
    const formValue = {
      ...this.form.value,
      coverImageUrl: coverUrl || undefined
    };

    this.journeyService.createJourney(formValue).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Failed to create journey:', err);
      }
    });
  }
}
