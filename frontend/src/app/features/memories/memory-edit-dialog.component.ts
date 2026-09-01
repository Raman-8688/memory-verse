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
import { Memory, MemoryUpdateDto } from '@core/models/memory.model';
import { MemoryService } from '@core/services/memory.service';

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
        <button mat-icon-button class="close-btn" (click)="dialogRef.close()" [disabled]="isSaving()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="editForm" (ngSubmit)="save()" class="dialog-form">
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

        <!-- Story Narrative -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>The Story & Notes *</mat-label>
          <textarea matInput formControlName="story" rows="5" placeholder="Share what happened in this moment..."></textarea>
          @if (editForm.get('story')?.hasError('required') && editForm.get('story')?.touched) {
            <mat-error>The story narrative cannot be empty.</mat-error>
          }
        </mat-form-field>

        <footer class="dialog-actions">
          <button mat-button type="button" (click)="dialogRef.close()" [disabled]="isSaving()" class="cancel-btn">
            Cancel
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="editForm.invalid || isSaving()" class="save-btn">
            @if (isSaving()) {
              <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
              <span>Saving...</span>
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon>
                <span>Save Changes</span>
              </ng-container>
            }
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .edit-dialog-container {
      padding: var(--space-4);
      background-color: var(--mv-bg-surface);
      max-width: 580px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--mv-border);
      position: relative;
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
      gap: var(--space-2);
      padding-top: var(--space-3);
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

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding-top: var(--space-2);
      border-top: 1px solid var(--mv-border);
      margin-top: 4px;
    }

    .save-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      border-radius: var(--radius-md);
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
export class MemoryEditDialogComponent implements OnInit {
  readonly memory: Memory = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<MemoryEditDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly memoryService = inject(MemoryService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal<boolean>(false);
  editForm!: FormGroup;

  ngOnInit(): void {
    const memDate = this.memory.memoryDate ? new Date(this.memory.memoryDate) : new Date();

    this.editForm = this.fb.group({
      title: [this.memory.title, [Validators.required, Validators.maxLength(200)]],
      memoryDate: [memDate, Validators.required],
      locationName: [this.memory.locationName || ''],
      story: [this.memory.story, Validators.required]
    });
  }

  save(): void {
    if (this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.editForm.value;

    const dateStr = formVal.memoryDate instanceof Date
      ? formVal.memoryDate.toISOString().split('T')[0]
      : formVal.memoryDate;

    const payload: MemoryUpdateDto = {
      title: formVal.title.trim(),
      story: formVal.story.trim(),
      memoryDate: dateStr,
      locationName: formVal.locationName ? formVal.locationName.trim() : undefined
    };

    this.memoryService.updateMemory(this.memory.id, payload).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.snackBar.open('Memory updated successfully', 'OK', { duration: 3000 });
        this.dialogRef.close(updated);
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
