import { Component, ElementRef, EventEmitter, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'mv-desktop-upload-dropzone',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div
      class="dropzone-box"
      [class.drag-over]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="triggerFilePicker()"
    >
      <div class="dropzone-content">
        <div class="icon-circle" [class.highlight]="isDragging()">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
        </div>

        <div class="text-block">
          <h4 class="dropzone-title">
            {{ isDragging() ? 'Drop photographs or videos here' : 'Drag & drop media here, or browse files' }}
          </h4>
          <p class="dropzone-hint">
            Supports high-resolution JPG/PNG and 60fps MP4 video clips (up to 50MB per video)
          </p>
        </div>

        <button mat-stroked-button color="primary" type="button" class="browse-btn" (click)="$event.stopPropagation(); triggerFilePicker()">
          <mat-icon>folder_open</mat-icon>
          <span>Select from Device</span>
        </button>
      </div>

      <!-- Hidden standard HTML5 multi-file input -->
      <input
        #fileInput
        type="file"
        accept="image/*,video/mp4"
        multiple
        (change)="onFileInputChange($event)"
        class="visually-hidden"
      />
    </div>
  `,
  styles: [`
    .dropzone-box {
      border: 2px dashed var(--mv-border);
      border-radius: var(--radius-lg);
      background-color: var(--mv-bg-subtle);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dropzone-box:hover, .dropzone-box.drag-over {
      border-color: var(--mv-primary);
      background-color: #fefce8; /* Warm light amber-50 */
      transform: translateY(-1px);
    }

    .dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      max-width: 480px;
    }

    .icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s ease;
    }

    .icon-circle.highlight {
      transform: scale(1.12);
      background-color: var(--mv-primary);
      color: #ffffff;
    }

    .upload-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .text-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dropzone-title {
      font-family: var(--font-editorial);
      font-size: 1.35rem;
      margin: 0;
      color: var(--mv-text-primary);
    }

    .dropzone-hint {
      font-size: 0.85rem;
      color: var(--mv-text-muted);
      margin: 0;
      line-height: 1.4;
    }

    .browse-btn {
      margin-top: var(--space-2);
      border-radius: var(--radius-md);
      font-weight: 600;
      border-color: var(--mv-primary);
      color: var(--mv-primary);
    }

    .browse-btn:hover {
      background-color: rgba(180, 83, 9, 0.08);
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
export class DesktopUploadDropzoneComponent {
  @Output() filesSelected = new EventEmitter<File[]>();

  @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

  readonly isDragging = signal<boolean>(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      this.filesSelected.emit(files);
    }
  }

  triggerFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.filesSelected.emit(files);
      // Reset input value to allow selecting the same file again if desired
      input.value = '';
    }
  }
}
