import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '@core/services/user.service';
import { switchMap, of } from 'rxjs';

@Component({
  selector: 'mv-add-person-dialog',
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
          <span class="sub-tag">Admin Management</span>
          <h2 class="dialog-title">Add New Companion</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="addForm" (ngSubmit)="onSubmit()" class="dialog-form">
        <!-- Direct System File Upload Area -->
        <div class="avatar-upload-card">
          <div class="avatar-clickable-wrapper" (click)="fileInput.click()" title="Click to browse photo from computer">
            <img [src]="previewImage()" 
                 alt="Companion photo" 
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
              <p class="meta-sub">Choose a picture from your device (optional).</p>
            }

            <div class="upload-actions">
              <button type="button" mat-stroked-button class="browse-btn" (click)="fileInput.click()">
                <mat-icon>folder_open</mat-icon>
                <span>{{ selectedFile ? 'Change Photo' : 'Browse Picture' }}</span>
              </button>
            </div>

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
          <input matInput formControlName="fullName" placeholder="e.g. Maya Chen">
          <mat-icon matPrefix class="field-icon">person</mat-icon>
          @if (addForm.get('fullName')?.hasError('required') && addForm.get('fullName')?.touched) {
            <mat-error>Full name is required</mat-error>
          }
        </mat-form-field>

        <!-- Email Input -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g. maya@memoryverse.com">
          <mat-icon matPrefix class="field-icon">mail</mat-icon>
          @if (addForm.get('email')?.hasError('required') && addForm.get('email')?.touched) {
            <mat-error>Email address is required</mat-error>
          }
          @if (addForm.get('email')?.hasError('email') && addForm.get('email')?.touched) {
            <mat-error>Please enter a valid email address</mat-error>
          }
        </mat-form-field>

        <!-- Password Input -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Initial Password</mat-label>
          <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" placeholder="Min 6 characters">
          <mat-icon matPrefix class="field-icon">lock</mat-icon>
          <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())" [attr.aria-label]="'Hide password'">
            <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (addForm.get('password')?.hasError('required') && addForm.get('password')?.touched) {
            <mat-error>Password is required</mat-error>
          }
          @if (addForm.get('password')?.hasError('minlength') && addForm.get('password')?.touched) {
            <mat-error>Password must be at least 6 characters</mat-error>
          }
        </mat-form-field>

        <!-- Access Role Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Access Role</mat-label>
          <mat-select formControlName="role">
            <mat-option value="MEMBER">
              <div class="role-option">
                <strong>MEMBER</strong>
                <span class="role-desc">Standard companion: can view and contribute memories</span>
              </div>
            </mat-option>
            <mat-option value="ADMIN">
              <div class="role-option">
                <strong class="admin-txt">ADMIN</strong>
                <span class="role-desc">Full administrator: full management access</span>
              </div>
            </mat-option>
          </mat-select>
          <mat-icon matPrefix class="field-icon">security</mat-icon>
        </mat-form-field>

        @if (errorMessage()) {
          <div class="error-banner">
            <mat-icon>error</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Dialog Footer Actions -->
        <div class="dialog-actions">
          <button type="button" mat-button (click)="dialogRef.close()" [disabled]="isSaving()">
            Cancel
          </button>
          <button type="submit" mat-flat-button color="primary" class="save-btn" [disabled]="addForm.invalid || isSaving()">
            @if (isSaving()) {
              <mat-spinner diameter="18" class="save-spinner"></mat-spinner>
              <span>Adding Companion...</span>
            } @else {
              <ng-container>
                <mat-icon>person_add</mat-icon>
                <span>Create Companion</span>
              </ng-container>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: var(--space-4, 16px);
      background-color: var(--mv-bg-surface);
      color: var(--mv-text-primary);
      min-width: 340px;
      max-width: 520px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-4, 16px);
      border-bottom: 1px solid var(--mv-border);
      padding-bottom: var(--space-2, 8px);
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
      color: var(--mv-text-primary);
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .avatar-upload-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--mv-bg-subtle, #f5f5f4);
      border-radius: var(--radius-lg, 12px);
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
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--mv-primary);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
    }

    .camera-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      color: #f5f5f4;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #ffffff;
      transition: all 0.2s ease;
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
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
      font-size: 0.92rem;
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
      border: 1px solid rgba(180, 83, 9, 0.25);
      border-radius: 9999px;
      padding: 2px 10px;
      margin: 3px 0;
      max-width: 100%;
    }

    .pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mv-primary);
      flex-shrink: 0;
    }

    .file-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--mv-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .clear-file-btn {
      width: 18px;
      height: 18px;
      line-height: 18px;
      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
    }

    .upload-actions {
      margin-top: 4px;
    }

    .browse-btn {
      font-size: 0.78rem;
      height: 30px;
      line-height: 28px;
      padding: 0 10px;
      gap: 5px;
      border-radius: var(--radius-md, 8px);
      border-color: var(--mv-border);
      color: var(--mv-text-primary);
      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    .full-width {
      width: 100%;
    }

    .field-icon {
      color: var(--mv-text-secondary);
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .role-option {
      display: flex;
      flex-direction: column;
      padding: 4px 0;
      strong {
        font-size: 0.9rem;
      }
      .admin-txt {
        color: var(--mv-primary);
      }
      .role-desc {
        font-size: 0.75rem;
        color: var(--mv-text-secondary);
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 8px 12px;
      border-radius: var(--radius-md, 8px);
      font-size: 0.85rem;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: var(--space-2, 8px);
      padding-top: var(--space-3, 12px);
      border-top: 1px solid var(--mv-border);
    }

    .save-btn {
      background-color: var(--mv-primary);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      border-radius: var(--radius-full, 9999px);
      padding: 0 20px;
      height: 40px;
    }

    .save-spinner ::ng-deep circle {
      stroke: #ffffff !important;
    }
  `]
})
export class AddPersonDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddPersonDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal<boolean>(true);
  readonly defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  selectedFile: File | null = null;
  readonly selectedFileName = signal<string | null>(null);
  readonly localPreviewUrl = signal<string | null>(null);

  readonly addForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['MEMBER', Validators.required]
  });

  previewImage(): string {
    return this.localPreviewUrl() || this.defaultAvatar;
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

  onSubmit(): void {
    if (this.addForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const { fullName, email, password, role } = this.addForm.value;

    this.userService.createUser({
      fullName,
      email,
      password,
      role
    }).pipe(
      switchMap((createdUser) => {
        if (this.selectedFile && createdUser && createdUser.id) {
          return this.userService.uploadAvatar(createdUser.id, this.selectedFile);
        }
        return of(createdUser);
      })
    ).subscribe({
      next: (finalUser) => {
        this.isSaving.set(false);
        this.snackBar.open(`Companion "${finalUser.fullName}" created successfully!`, 'OK', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'bottom'
        });
        this.dialogRef.close(finalUser);
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Failed to create companion:', err);
        const msg = err?.error?.message || 'Failed to create companion. Please try again.';
        this.errorMessage.set(msg);
      }
    });
  }
}