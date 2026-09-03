import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpEventType } from '@angular/common/http';
import { Memory, MemoryUpdateDto, PrivacyLevel } from '@core/models/memory.model';
import { MemoryService } from '@core/services/memory.service';
import { NotificationStateService } from '@core/services/notification-state.service';

interface EditPreviewItem {
  file: File;
  url: string;
  isVideo: boolean;
}

@Component({
  selector: 'mv-memory-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
          <span class="sub-label">Memory Archive</span>
          <h2 class="editorial-title">Edit Memory Story</h2>
        </div>
        <button mat-icon-button class="close-btn" (click)="dialogRef.close()" [disabled]="isSaving()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="editForm" (ngSubmit)="save()" class="dialog-form">
        <mat-dialog-content class="edit-dialog-scrollable-content">
          <!-- Title -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Memory Title *</mat-label>
            <input matInput formControlName="title" placeholder="e.g. Sunset at Hostel Terrace" />
            @if (editForm.get('title')?.hasError('required') && editForm.get('title')?.touched) {
              <mat-error>A memory title is required.</mat-error>
            }
          </mat-form-field>

          <!-- Date & Location Row -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Memory Date *</mat-label>
              <input matInput [matDatepicker]="datePicker" formControlName="memoryDate" />
              <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
              <mat-datepicker #datePicker></mat-datepicker>
              @if (editForm.get('memoryDate')?.hasError('required') && editForm.get('memoryDate')?.touched) {
                <mat-error>A date is required.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Location</mat-label>
              <input matInput formControlName="locationName" placeholder="e.g. Campus Amphitheater" />
              <mat-icon matSuffix>place</mat-icon>
            </mat-form-field>
          </div>

          <!-- Privacy Level Selector -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Privacy Level</mat-label>
            <mat-select formControlName="privacyLevel">
              <mat-option value="PRIVATE_TO_ME">🔒 Private to Me (Only visible to you)</mat-option>
              <mat-option value="CIRCLE_COMPANIONS">👥 Circle Companions (Visible to group & companions)</mat-option>
              <mat-option value="PUBLIC_ARCHIVE">🌐 Public Archive (Accessible via share link)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Story Narrative -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>The Story & Notes *</mat-label>
            <textarea matInput formControlName="story" rows="4" placeholder="Share what happened in this moment..."></textarea>
            @if (editForm.get('story')?.hasError('required') && editForm.get('story')?.touched) {
              <mat-error>The story narrative cannot be empty.</mat-error>
            }
          </mat-form-field>

          <!-- Upload & Append Photos Section -->
          <div class="media-upload-section">
            <div class="upload-section-header">
              <div>
                <span class="upload-title">Capture & Append Photos</span>
                <span class="upload-desc">Add new snapshots directly into this memory.</span>
              </div>
              <label class="add-photos-pill">
                <mat-icon>add_a_photo</mat-icon>
                <span>Choose Files</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  (change)="onFilesSelected($event)" 
                  hidden 
                  [disabled]="isSaving()"
                />
              </label>
            </div>

            @if (filePreviews().length > 0) {
              <div class="new-media-previews">
                @for (item of filePreviews(); track item.file.name; let idx = $index) {
                  <div class="edit-preview-tile">
                    @if (item.isVideo) {
                      <video [src]="item.url" class="preview-img"></video>
                      <div class="video-indicator"><mat-icon>videocam</mat-icon></div>
                    } @else {
                      <img [src]="item.url" [alt]="item.file.name" class="preview-img" />
                    }
                    <button type="button" class="remove-btn" (click)="removeFile(idx)" [disabled]="isSaving()" aria-label="Remove image">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </mat-dialog-content>

        <mat-dialog-actions class="dialog-actions">
          <button mat-button type="button" (click)="dialogRef.close()" [disabled]="isSaving()" class="cancel-btn">
            Cancel
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="editForm.invalid || isSaving()" class="save-btn">
            @if (isSaving()) {
              <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
              <span>{{ savingStatus() }}</span>
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon>
                <span>Save Changes</span>
              </ng-container>
            }
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .edit-dialog-container {
      padding: var(--mv-space-16);
      background-color: var(--mv-bg-surface);
      max-width: 580px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      max-height: 85vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: var(--mv-space-12);
      border-bottom: 1px solid var(--mv-border);
      position: relative;
      flex-shrink: 0;
    }

    .header-icon-wrap {
      width: 40px;
      height: 40px;
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
      font-size: 1.45rem;
      margin: 2px 0 0;
      line-height: 1.2;
    }

    .close-btn {
      position: absolute;
      right: -4px;
      top: -4px;
      color: var(--mv-text-muted);
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Fixed height scrollable content area */
    .edit-dialog-scrollable-content {
      max-height: 60vh;
      overflow-y: auto;
      padding: var(--mv-space-16) 4px var(--mv-space-12);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--mv-space-12);
      box-sizing: border-box;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .half-width {
      flex: 1;
    }

    /* Media Upload Section */
    .media-upload-section {
      background-color: var(--mv-bg-subtle);
      border: 1px dashed var(--mv-border);
      border-radius: var(--mv-radius-md);
      padding: var(--mv-space-12) var(--mv-space-16);
      display: flex;
      flex-direction: column;
      gap: var(--mv-space-12);
    }

    .upload-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--mv-space-8);
    }

    .upload-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--mv-text-primary);
      display: block;
    }

    .upload-desc {
      font-size: 0.75rem;
      color: var(--mv-text-muted);
      display: block;
    }

    .add-photos-pill {
      background-color: var(--mv-primary-light);
      border: 1px solid var(--mv-primary);
      color: var(--mv-primary);
      padding: 6px 14px;
      border-radius: var(--mv-radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all var(--mv-transition-fast);

      &:hover { background-color: #fde68a; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .new-media-previews {
      display: flex;
      gap: var(--mv-space-8);
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .edit-preview-tile {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: var(--mv-radius-md);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      flex-shrink: 0;
    }

    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-indicator {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      border-radius: 50%;
      padding: 1px;
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }

    .remove-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      color: #fff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { background: #dc2626; }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: var(--mv-space-12);
      border-top: 1px solid var(--mv-border);
      margin-top: var(--mv-space-8);
      flex-shrink: 0;
    }

    .save-btn {
      background-color: var(--mv-primary) !important;
      border-radius: var(--mv-radius-full) !important;
      font-weight: 600;
      min-height: 40px;
      padding: 0 20px;
    }

    .cancel-btn {
      color: var(--mv-text-secondary);
    }

    .btn-spinner {
      margin-right: 6px;
    }
  `]
})
export class MemoryEditDialogComponent implements OnInit, OnDestroy {
  readonly memory: Memory = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<MemoryEditDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly memoryService = inject(MemoryService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal<boolean>(false);
  readonly savingStatus = signal<string>('Saving...');
  readonly filePreviews = signal<EditPreviewItem[]>([]);
  private selectedFiles: File[] = [];

  editForm!: FormGroup;

  ngOnInit(): void {
    const memDate = this.memory.memoryDate ? new Date(this.memory.memoryDate) : new Date();

    this.editForm = this.fb.group({
      title: [this.memory.title, [Validators.required, Validators.maxLength(200)]],
      memoryDate: [memDate, Validators.required],
      locationName: [this.memory.locationName || ''],
      privacyLevel: [this.memory.privacyLevel || 'CIRCLE_COMPANIONS'],
      story: [this.memory.story, Validators.required]
    });
  }

  ngOnDestroy(): void {
    this.filePreviews().forEach(p => URL.revokeObjectURL(p.url));
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);
    // Crucial: reset input value immediately to avoid double firing
    input.value = '';

    // Deduplicate files by name and size
    const existingKeys = new Set(this.selectedFiles.map(f => `${f.name}_${f.size}`));
    const deduplicated = newFiles.filter(f => !existingKeys.has(`${f.name}_${f.size}`));

    if (deduplicated.length === 0) return;

    this.selectedFiles.push(...deduplicated);

    const newPreviews = deduplicated.map(file => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4')
    }));

    this.filePreviews.update(prev => [...prev, ...newPreviews]);
  }

  removeFile(index: number): void {
    const current = this.filePreviews();
    if (index >= 0 && index < current.length) {
      URL.revokeObjectURL(current[index].url);
      this.filePreviews.set(current.filter((_, idx) => idx !== index));
      this.selectedFiles.splice(index, 1);
    }
  }

  save(): void {
    if (this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.savingStatus.set('Updating story...');
    const formVal = this.editForm.value;

    const dateStr = formVal.memoryDate instanceof Date
      ? formVal.memoryDate.toISOString().split('T')[0]
      : formVal.memoryDate;

    const payload: MemoryUpdateDto = {
      title: formVal.title.trim(),
      story: formVal.story.trim(),
      memoryDate: dateStr,
      locationName: formVal.locationName ? formVal.locationName.trim() : undefined,
      privacyLevel: formVal.privacyLevel as PrivacyLevel
    };

    this.memoryService.updateMemory(this.memory.id, payload).subscribe({
      next: (updated) => {
        if (this.selectedFiles.length > 0) {
          this.savingStatus.set(`Uploading ${this.selectedFiles.length} photo(s)...`);
          const filesToUpload = [...this.selectedFiles];
          this.selectedFiles = []; // Clear array immediately
          this.memoryService.appendMediaWithProgress(this.memory.id, filesToUpload).subscribe({
            next: (httpEvent) => {
              if (httpEvent.type === HttpEventType.Response) {
                this.isSaving.set(false);
                const fullUpdated: Memory = httpEvent.body?.data || httpEvent.body || updated;
                this.notificationState.refresh();
                this.snackBar.open('Memory and photos updated successfully!', 'OK', { duration: 3000 });
                this.dialogRef.close(fullUpdated);
              }
            },
            error: (err) => {
              this.isSaving.set(false);
              console.error('Failed to append media during edit:', err);
              this.snackBar.open('Story updated, but some media uploads failed.', 'OK', { duration: 3500 });
              this.dialogRef.close(updated);
            }
          });
        } else {
          this.isSaving.set(false);
          this.notificationState.refresh();
          this.snackBar.open('Memory updated successfully', 'OK', { duration: 3000 });
          this.dialogRef.close(updated);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Failed to update memory:', err);
        const msg = err.error?.message || 'Failed to update memory. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
