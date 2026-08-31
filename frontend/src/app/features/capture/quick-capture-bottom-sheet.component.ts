import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'mv-quick-capture-bottom-sheet',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatButtonModule],
  template: `
    <div class="capture-sheet-container">
      <!-- Sheet Header Handle -->
      <div class="sheet-drag-handle"></div>

      <header class="sheet-header">
        <h3 class="sheet-title">Capture & Add Moment</h3>
        <p class="sheet-subtitle">Select how you would like to preserve this memory</p>
      </header>

      <!-- Action Items List -->
      <mat-nav-list class="actions-list">
        <!-- 1. Take Photo via Native Camera -->
        <a mat-list-item class="action-item" (click)="triggerPhotoCapture()">
          <span matListItemTitle class="action-title">Take Photo</span>
          <span matListItemLine class="action-line">Open device camera for instant capture</span>
          <div matListItemMeta class="icon-bubble camera">
            <mat-icon>photo_camera</mat-icon>
          </div>
        </a>

        <!-- 2. Record Video via Native Video Recorder -->
        <a mat-list-item class="action-item" (click)="triggerVideoCapture()">
          <span matListItemTitle class="action-title">Record Video</span>
          <span matListItemLine class="action-line">Capture live MP4 video snippet</span>
          <div matListItemMeta class="icon-bubble video">
            <mat-icon>videocam</mat-icon>
          </div>
        </a>

        <!-- 3. Choose from Device Gallery -->
        <a mat-list-item class="action-item" (click)="triggerGalleryPicker()">
          <span matListItemTitle class="action-title">Choose from Gallery</span>
          <span matListItemLine class="action-line">Pick existing photographs or videos</span>
          <div matListItemMeta class="icon-bubble gallery">
            <mat-icon>photo_library</mat-icon>
          </div>
        </a>

        <!-- 4. Browse Files -->
        <a mat-list-item class="action-item" (click)="triggerFilePicker()">
          <span matListItemTitle class="action-title">Browse Files</span>
          <span matListItemLine class="action-line">Select media from phone storage or folders</span>
          <div matListItemMeta class="icon-bubble files">
            <mat-icon>folder_open</mat-icon>
          </div>
        </a>
      </mat-nav-list>

      <button mat-button class="cancel-sheet-btn" (click)="cancel()">
        <span>Cancel</span>
      </button>

      <!-- Hidden Standard HTML5 Input Elements -->
      <!-- Native Camera Photo Capture -->
      <input
        #photoInput
        type="file"
        accept="image/*"
        capture="environment"
        (change)="onFilesSelected($event)"
        class="visually-hidden"
      />

      <!-- Native Camera Video Recording -->
      <input
        #videoInput
        type="file"
        accept="video/*"
        capture="environment"
        (change)="onFilesSelected($event)"
        class="visually-hidden"
      />

      <!-- Multi-file Gallery / Storage Picker -->
      <input
        #galleryInput
        type="file"
        accept="image/*,video/*"
        multiple
        (change)="onFilesSelected($event)"
        class="visually-hidden"
      />
    </div>
  `,
  styles: [`
    .capture-sheet-container {
      padding: var(--space-2) var(--space-2) var(--space-4);
      background-color: var(--mv-bg-surface);
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
    }

    .sheet-drag-handle {
      width: 40px;
      height: 4px;
      background-color: var(--mv-border);
      border-radius: 2px;
      margin: 4px auto 14px;
    }

    .sheet-header {
      padding: 0 var(--space-2) var(--space-2);
      text-align: center;
    }

    .sheet-title {
      font-family: var(--font-editorial);
      font-size: 1.45rem;
      margin: 0 0 4px;
      color: var(--mv-text-primary);
    }

    .sheet-subtitle {
      font-size: 0.82rem;
      color: var(--mv-text-muted);
      margin: 0;
    }

    .actions-list {
      padding-top: var(--space-2);
    }

    .action-item {
      border-radius: var(--radius-md);
      margin-bottom: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .action-item:hover {
      background-color: var(--mv-bg-subtle);
    }

    .action-title {
      font-weight: 600;
      color: var(--mv-text-primary);
      font-size: 0.95rem;
    }

    .action-line {
      font-size: 0.78rem;
      color: var(--mv-text-secondary);
    }

    .icon-bubble {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-bubble mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .icon-bubble.camera {
      background-color: #fef3c7;
      color: var(--mv-primary);
    }

    .icon-bubble.video {
      background-color: #fee2e2;
      color: #b91c1c;
    }

    .icon-bubble.gallery {
      background-color: #e0e7ff;
      color: #4338ca;
    }

    .icon-bubble.files {
      background-color: #f3f4f6;
      color: #4b5563;
    }

    .cancel-sheet-btn {
      width: 100%;
      margin-top: var(--space-2);
      color: var(--mv-text-secondary);
      font-weight: 500;
      border-radius: var(--radius-md);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class QuickCaptureBottomSheetComponent {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<QuickCaptureBottomSheetComponent>);

  @ViewChild('photoInput') private photoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') private videoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') private galleryInputRef!: ElementRef<HTMLInputElement>;

  triggerPhotoCapture(): void {
    this.photoInputRef?.nativeElement.click();
  }

  triggerVideoCapture(): void {
    this.videoInputRef?.nativeElement.click();
  }

  triggerGalleryPicker(): void {
    this.galleryInputRef?.nativeElement.click();
  }

  triggerFilePicker(): void {
    this.galleryInputRef?.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      // Dismiss sheet and return captured in-memory File[] array
      this.bottomSheetRef.dismiss(filesArray);
    }
  }

  cancel(): void {
    this.bottomSheetRef.dismiss();
  }
}
