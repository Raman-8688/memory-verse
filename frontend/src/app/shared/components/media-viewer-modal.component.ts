import { Component, HostListener, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GalleryItem } from '@core/models/gallery.model';
import { DownloadService } from '@core/services/download.service';

export interface MediaViewerData {
  items: GalleryItem[];
  startIndex: number;
}

@Component({
  selector: 'mv-media-viewer-modal',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './media-viewer-modal.component.html',
  styleUrl: './media-viewer-modal.component.scss'
})
export class MediaViewerModalComponent {
  private readonly router = inject(Router);
  private readonly downloadService = inject(DownloadService);
  private readonly dialogRef = inject(MatDialogRef<MediaViewerModalComponent>);

  readonly currentIndex = signal<number>(0);
  readonly isDownloadingCurrent = signal<boolean>(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: MediaViewerData) {
    if (data && data.startIndex >= 0 && data.startIndex < data.items.length) {
      this.currentIndex.set(data.startIndex);
    }
  }

  readonly currentItem = computed<GalleryItem | null>(() => {
    const items = this.data?.items;
    const idx = this.currentIndex();
    if (items && idx >= 0 && idx < items.length) {
      return items[idx];
    }
    return null;
  });

  // Keyboard Navigation: ArrowLeft, ArrowRight, Escape
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeViewer();
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(idx => idx - 1);
    }
  }

  next(): void {
    if (this.currentIndex() < this.data.items.length - 1) {
      this.currentIndex.update(idx => idx + 1);
    }
  }

  async downloadCurrentMedia(): Promise<void> {
    const item = this.currentItem();
    if (!item) return;

    this.isDownloadingCurrent.set(true);
    try {
      await this.downloadService.downloadMedia(item.mediaUrl, item.fileName || 'memory-media');
    } catch (err: unknown) {
      console.error('Download failed:', err);
    } finally {
      this.isDownloadingCurrent.set(false);
    }
  }

  navigateToMemory(memoryId: string): void {
    this.dialogRef.close();
    this.router.navigate(['/memories', memoryId]);
  }

  onStageClick(event: MouseEvent): void {
    // Clicking backdrop outside of controls closes viewer
    this.closeViewer();
  }

  closeViewer(): void {
    this.dialogRef.close();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
