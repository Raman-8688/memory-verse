import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JourneySection, JourneySectionCreateDto } from '@core/models/journey.model';
import { JourneyService } from '@core/services/journey.service';
import { MediaService } from '@core/services/media.service';

export interface ChapterEditDialogData {
  journeyId: string;
  section: JourneySection;
}

@Component({
  selector: 'mv-chapter-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="edit-dialog-container">
      <header class="dialog-header">
        <div class="header-icon-wrap">
          <mat-icon>auto_stories</mat-icon>
        </div>
        <div>
          <span class="sub-label">Chapter Management</span>
          <h2 class="editorial-title">Edit Chapter Details</h2>
        </div>
        <button mat-icon-button class="close-btn" (click)="dialogRef.close()" [disabled]="isSaving()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="editForm" (ngSubmit)="save()" class="dialog-form">
        <mat-dialog-content class="edit-dialog-content">
          <!-- Title -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Chapter Title *</mat-label>
            <input matInput formControlName="title" placeholder="e.g. First Year & Hostel Beginnings" />
            @if (editForm.get('title')?.hasError('required') && editForm.get('title')?.touched) {
              <mat-error>A chapter title is required.</mat-error>
            }
          </mat-form-field>

          <!-- Dates Row -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" placeholder="YYYY-MM-DD" />
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" placeholder="YYYY-MM-DD" />
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Chapter Cover Image Upload Section -->
          <div class="cover-upload-block">
            <label class="section-label">Chapter Cover Photo</label>

            <!-- Hidden single file input -->
            <input 
              type="file" 
              #coverFileInput 
              accept="image/*" 
              (change)="onCoverFileSelected($event)" 
              style="display: none;" />

            @if (coverPreviewUrl()) {
              <div class="cover-preview-card">
                <img [src]="coverPreviewUrl()" alt="Chapter cover preview" class="cover-preview-img" />
                <div class="preview-actions-overlay">
                  <button type="button" mat-flat-button class="overlay-btn change-btn" (click)="coverFileInput.click()" [disabled]="isSaving()">
                    <mat-icon>photo_camera</mat-icon>
                    <span>Change Photo</span>
                  </button>
                  <button type="button" mat-stroked-button class="overlay-btn remove-btn" (click)="removeCover()" [disabled]="isSaving()">
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
                  <strong>Upload Chapter Photo from Device</strong>
                  <span>Browse from computer, phone gallery, or camera</span>
                </div>
              </div>
            }
          </div>

          <!-- Description -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Story / Narrative</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="What unforgettable memories defined this chapter?"></textarea>
          </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end" class="dialog-actions">
          <button mat-button type="button" (click)="dialogRef.close()" [disabled]="isSaving()" class="cancel-btn">
            Cancel
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="editForm.invalid || isSaving()" class="save-btn">
            @if (isSaving()) {
              <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
              <span>{{ isUploadingCover() ? 'Uploading Photo...' : 'Saving Changes...' }}</span>
            } @else {
              <ng-container>
                <mat-icon>check</mat-icon>
                <span>Save Chapter</span>
              </ng-container>
            }
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .edit-dialog-container {
      padding: var(--space-4, 16px);
      background-color: var(--mv-bg-surface);
      max-width: 580px;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      box-sizing: border-box;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: var(--space-2, 8px);
      border-bottom: 1px solid var(--mv-border);
      position: relative;
      flex-shrink: 0;
    }

    .header-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sub-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mv-primary);
      display: block;
    }

    .editorial-title {
      font-family: var(--font-editorial);
      font-size: 1.55rem;
      margin: 2px 0 0;
      line-height: 1.2;
    }

    .close-btn {
      position: absolute;
      right: -8px;
      top: -8px;
      color: var(--mv-text-muted);
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .edit-dialog-content {
      max-height: 65vh;
      overflow-y: auto;
      padding: 16px 4px 12px;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
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

    .cover-upload-block {
      margin: 4px 0 12px;
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
      border-radius: var(--radius-md, 8px);
      padding: 16px;
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
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #ffffff;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0,0,0,0.1));
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
      font-size: 0.76rem;
      color: var(--mv-text-muted);
    }

    .cover-preview-card {
      position: relative;
      width: 100%;
      height: 160px;
      max-height: 160px;
      border-radius: var(--mv-radius, 8px);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0,0,0,0.1));
      background-color: #1c1917;
    }

    .cover-preview-img {
      width: 100%;
      height: 100%;
      max-height: 160px;
      object-fit: cover;
      border-radius: var(--mv-radius, 8px);
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
      border-radius: var(--radius-full, 9999px);
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

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding-top: var(--space-2, 8px);
      border-top: 1px solid var(--mv-border);
      margin-top: 4px;
      flex-shrink: 0;
    }

    .save-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      border-radius: var(--radius-md, 8px);
      padding: 0 20px;
      height: 40px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .save-btn:disabled {
      background-color: #e5e7eb !important;
      color: #9ca3af !important;
    }

    .cancel-btn {
      color: var(--mv-text-secondary);
    }

    .btn-spinner {
      margin-right: 6px;
    }
  `]
})
export class ChapterEditDialogComponent implements OnInit {
  readonly data: ChapterEditDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ChapterEditDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly journeyService = inject(JourneyService);
  private readonly mediaService = inject(MediaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly coverPreviewUrl = signal<string | null>(this.data.section.imageUrl || null);
  readonly selectedCoverFile = signal<File | null>(null);

  editForm!: FormGroup;

  ngOnInit(): void {
    const start = this.parseDate(this.data.section.startDate);
    const end = this.parseDate(this.data.section.endDate);

    this.editForm = this.fb.group({
      title: [this.data.section.title, [Validators.required, Validators.maxLength(150)]],
      description: [this.data.section.description || ''],
      startDate: [start],
      endDate: [end]
    });
  }

  private parseDate(val?: string | null): Date | null {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDateString(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof val === 'string' && val.trim().length > 0) {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return val.trim();
    }
    return null;
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedCoverFile.set(file);
    const objectUrl = URL.createObjectURL(file);
    this.coverPreviewUrl.set(objectUrl);
    input.value = '';
  }

  removeCover(): void {
    this.selectedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
  }

  save(): void {
    if (this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const file = this.selectedCoverFile();
    if (file) {
      this.isUploadingCover.set(true);
      this.mediaService.uploadSingleFile(file).subscribe({
        next: (uploaded) => {
          this.isUploadingCover.set(false);
          this.executeSectionUpdate(uploaded.mediaUrl);
        },
        error: (err) => {
          this.isUploadingCover.set(false);
          this.isSaving.set(false);
          console.error('Failed to upload chapter photo:', err);
          this.snackBar.open('Failed to upload chapter photo. Please try again.', 'Close', { duration: 4000 });
        }
      });
    } else {
      this.executeSectionUpdate(this.coverPreviewUrl());
    }
  }

  private executeSectionUpdate(finalCoverUrl: string | null): void {
    const formVal = this.editForm.value;

    const startDateStr = this.formatDateString(formVal.startDate);
    const endDateStr = this.formatDateString(formVal.endDate);

    const payload: JourneySectionCreateDto = {
      title: formVal.title.trim(),
      description: formVal.description?.trim() || undefined,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
      imageUrl: finalCoverUrl ? finalCoverUrl.trim() : undefined
    };

    this.journeyService.updateSection(this.data.journeyId, this.data.section.id, payload).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.snackBar.open('Chapter updated successfully', 'OK', { duration: 3000 });
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Failed to update chapter:', err);
        const msg = err.error?.message || 'Failed to update chapter. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
