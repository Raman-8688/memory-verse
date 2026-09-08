import { Component, ElementRef, ViewChild, inject, signal, OnDestroy, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MomentService } from '@core/services/moment.service';
import { DesktopUploadDropzoneComponent } from '../capture/desktop-upload-dropzone.component';

export interface SelectedFilePreview {
  file: File;
  previewUrl: string;
  isVideo: boolean;
  name: string;
}

@Component({
  selector: 'mv-moment-composer-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DesktopUploadDropzoneComponent
  ],
  templateUrl: './moment-composer-sheet.component.html',
  styleUrl: './moment-composer-sheet.component.scss'
})
export class MomentComposerSheetComponent implements OnDestroy {
  private readonly momentService = inject(MomentService);
  private readonly snackBar = inject(MatSnackBar);

  @Optional() private readonly bottomSheetRef = inject(MatBottomSheetRef<MomentComposerSheetComponent>, { optional: true });
  @Optional() private readonly dialogRef = inject(MatDialogRef<MomentComposerSheetComponent>, { optional: true });

  @ViewChild('cameraInput') private cameraInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') private galleryInputRef!: ElementRef<HTMLInputElement>;

  readonly selectedFiles = signal<SelectedFilePreview[]>([]);
  caption = '';
  readonly isSubmitting = signal<boolean>(false);

  ngOnDestroy(): void {
    // Revoke object URLs to prevent memory leaks
    this.selectedFiles().forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }

  triggerCamera(): void {
    this.cameraInputRef?.nativeElement.click();
  }

  triggerGallery(): void {
    this.galleryInputRef?.nativeElement.click();
  }

  onFilesSelected(files: File[]): void {
    if (!files || files.length === 0) return;

    const newPreviews: SelectedFilePreview[] = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/'),
      name: file.name
    }));

    this.selectedFiles.update(current => [...current, ...newPreviews]);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onFilesSelected(Array.from(input.files));
      input.value = '';
    }
  }

  removeFile(index: number): void {
    const list = [...this.selectedFiles()];
    if (index >= 0 && index < list.length) {
      const removed = list.splice(index, 1)[0];
      URL.revokeObjectURL(removed.previewUrl);
      this.selectedFiles.set(list);
    }
  }

  close(): void {
    if (this.bottomSheetRef) {
      this.bottomSheetRef.dismiss();
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  submit(): void {
    const files = this.selectedFiles().map(p => p.file);
    if (files.length === 0 || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    this.momentService.createMoment(files, this.caption).subscribe({
      next: created => {
        this.isSubmitting.set(false);
        this.snackBar.open('Moment shared!', 'Dismiss', {
          duration: 3500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        if (this.bottomSheetRef) {
          this.bottomSheetRef.dismiss(created);
        } else if (this.dialogRef) {
          this.dialogRef.close(created);
        }
      },
      error: err => {
        this.isSubmitting.set(false);
        console.error('Failed to publish moment', err);
        const errorMsg = err?.error?.message || 'Failed to share moment. Please try again.';
        this.snackBar.open(errorMsg, 'Dismiss', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
