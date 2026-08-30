import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from '@core/models/user.model';
import { UserService } from '@core/services/user.service';
import { switchMap, of } from 'rxjs';

@Component({
  selector: 'mv-user-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Dialog Header -->
      <header class="dialog-header">
        <div>
          <span class="sub-tag">Group Directory</span>
          <h2 class="dialog-title">Edit Member Profile</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="dialog-form">
        <!-- Direct System File Upload Area (No manual typing required) -->
        <div class="avatar-upload-card">
          <div class="avatar-clickable-wrapper" (click)="fileInput.click()" title="Click to browse photo from computer">
            <img [src]="previewImage()" 
                 [alt]="data.fullName" 
                 (error)="onAvatarError()" 
                 class="preview-avatar" />
            <div class="camera-badge">
              <mat-icon>photo_camera</mat-icon>
            </div>
          </div>

          <div class="upload-meta">
            <h4 class="meta-title">Profile Photograph</h4>
            @if (selectedFileName()) {
              <div class="selected-file-pill">
                <mat-icon class="pill-icon">check_circle</mat-icon>
                <span class="file-name">{{ selectedFileName() }}</span>
                <button type="button" mat-icon-button class="clear-file-btn" (click)="clearSelectedFile($event)" title="Clear selection">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            } @else {
              <p class="meta-sub">Browse a picture directly from your device.</p>
            }

            <div class="upload-actions">
              <button type="button" mat-stroked-button class="browse-btn" (click)="fileInput.click()">
                <mat-icon>folder_open</mat-icon>
                <span>{{ selectedFile ? 'Change Photo' : 'Browse from System' }}</span>
              </button>
            </div>

            <!-- Hidden File Input -->
            <input #fileInput 
                   type="file" 
                   accept="image/png,image/jpeg,image/jpg,image/webp" 
                   (change)="onFileSelected($event)" 
                   style="display: none;" />
          </div>
        </div>

        <!-- Full Name Input -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName" placeholder="e.g. Raman">
          <mat-icon matPrefix class="field-icon">person</mat-icon>
          @if (editForm.get('fullName')?.hasError('required') && editForm.get('fullName')?.touched) {
            <mat-error>Full name is required</mat-error>
          }
        </mat-form-field>

        <!-- Access Role Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Access Role</mat-label>
          <mat-select formControlName="role">
            <mat-option value="MEMBER">
              <div class="role-option">
                <strong>MEMBER</strong>
                <span class="role-desc">Standard member: can create and view memories</span>
              </div>
            </mat-option>
            <mat-option value="ADMIN">
              <div class="role-option">
                <strong class="admin-txt">ADMIN</strong>
                <span class="role-desc">Full administrator: manage group & chapters</span>
              </div>
            </mat-option>
          </mat-select>
          <mat-icon matPrefix class="field-icon">security</mat-icon>
        </mat-form-field>

        <!-- Dialog Footer Actions -->
        <div class="dialog-actions">
          <button type="button" mat-button (click)="dialogRef.close()" [disabled]="isSaving()">
            Cancel
          </button>
          <button type="submit" mat-flat-button color="primary" class="save-btn" [disabled]="editForm.invalid || isSaving()">
            @if (isSaving()) {
              <mat-spinner diameter="18" class="save-spinner"></mat-spinner>
              <span>Updating Member...</span>
            } @else {
              <ng-container>
                <mat-icon>check</mat-icon>
                <span>Save Profile</span>
              </ng-container>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: var(--space-4);
      background-color: var(--mv-bg-surface);
      color: var(--mv-text-primary);
      min-width: 340px;
      max-width: 520px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-4);
      border-bottom: 1px solid var(--mv-border);
      padding-bottom: var(--space-2);
    }

    .sub-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .dialog-title {
      font-family: var(--font-editorial);
      font-size: 1.65rem;
      margin: 2px 0 0 0;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .avatar-upload-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--mv-bg-subtle);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
      transition: border-color 0.2s ease;
    }

    .avatar-clickable-wrapper {
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      &:hover .camera-badge {
        background: var(--mv-primary);
        color: #ffffff;
      }
    }

    .preview-avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--mv-primary);
      box-shadow: var(--shadow-sm);
    }

    .camera-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      color: #f5f5f4;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #ffffff;
      transition: all 0.2s ease;
      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    .upload-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: var(--mv-text-primary);
    }

    .meta-sub {
      font-size: 0.78rem;
      color: var(--mv-text-secondary);
      margin: 0;
    }

    .selected-file-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(180, 83, 9, 0.1);
      border: 1px solid rgba(180, 83, 9, 0.3);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      max-width: 100%;
    }

    .pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mv-primary);
    }

    .file-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mv-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .clear-file-btn {
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .upload-actions {
      margin-top: 4px;
    }

    .browse-btn {
      font-size: 0.8rem !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
      border-color: var(--mv-border) !important;
      color: var(--mv-text-primary) !important;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--mv-primary);
      }
    }

    .full-width {
      width: 100%;
    }

    .field-icon {
      color: var(--mv-text-muted);
      margin-right: 8px;
    }

    .role-option {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      padding: 4px 0;
    }

    .role-desc {
      font-size: 0.75rem;
      color: var(--mv-text-muted);
    }

    .admin-txt {
      color: var(--mv-primary);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
      padding-top: 14px;
      border-top: 1px solid var(--mv-border);
    }

    .save-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 18px !important;
    }

    .save-spinner ::ng-deep circle {
      stroke: #ffffff !important;
    }
  `]
})
export class UserEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UserEditDialogComponent>);
  readonly data: User = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal<boolean>(false);
  readonly defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  selectedFile: File | null = null;
  readonly selectedFileName = signal<string | null>(null);
  readonly localPreviewUrl = signal<string | null>(null);

  readonly editForm: FormGroup = this.fb.group({
    fullName: [this.data.fullName, [Validators.required, Validators.minLength(2)]],
    role: [this.data.role, Validators.required]
  });

  previewImage(): string {
    return this.localPreviewUrl() || this.data.avatarUrl || this.defaultAvatar;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file;
      this.selectedFileName.set(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      this.localPreviewUrl.set(URL.createObjectURL(file));
    }
  }

  clearSelectedFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.localPreviewUrl.set(null);
  }

  onAvatarError(): void {
    this.localPreviewUrl.set(this.defaultAvatar);
  }

  onSubmit(): void {
    if (this.editForm.invalid) return;

    this.isSaving.set(true);
    const fullName = this.editForm.value.fullName;
    const role = this.editForm.value.role;

    // Step 1: If a new photo was chosen from the device, upload it first
    const uploadStep$ = this.selectedFile
      ? this.userService.uploadAvatar(this.data.id, this.selectedFile)
      : of(this.data);

    uploadStep$.pipe(
      // Step 2: Update member's name and role
      switchMap((userAfterAvatar) => {
        return this.userService.updateUser(this.data.id, {
          fullName,
          role,
          avatarUrl: userAfterAvatar.avatarUrl
        });
      })
    ).subscribe({
      next: (finalUser) => {
        this.isSaving.set(false);
        this.snackBar.open(`Member ${finalUser.fullName} updated successfully!`, 'OK', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'bottom'
        });
        this.dialogRef.close(finalUser);
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Failed to update member profile:', err);
      }
    });
  }
}
