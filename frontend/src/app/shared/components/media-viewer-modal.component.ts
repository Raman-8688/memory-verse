import { Component, HostListener, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GalleryItem } from '@core/models/gallery.model';
import { DownloadService } from '@core/services/download.service';
import { MemoryService } from '@core/services/memory.service';
import { AuthService } from '@core/auth/auth.service';
import { ImageFallbackDirective } from '../directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '../pipes/resolve-media-url.pipe';

export interface MediaViewerData {
  items: GalleryItem[];
  startIndex: number;
  canEdit?: boolean;
}

@Component({
  selector: 'mv-media-viewer-modal',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './media-viewer-modal.component.html',
  styleUrl: './media-viewer-modal.component.scss'
})
export class MediaViewerModalComponent {
  private readonly router = inject(Router);
  private readonly downloadService = inject(DownloadService);
  private readonly memoryService = inject(MemoryService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<MediaViewerModalComponent>);

  readonly items = signal<GalleryItem[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly isDownloadingCurrent = signal<boolean>(false);
  readonly isDeletingCurrent = signal<boolean>(false);
  readonly hasMediaModified = signal<boolean>(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: MediaViewerData) {
    const initialItems = data?.items ? [...data.items] : [];
    this.items.set(initialItems);
    if (data && data.startIndex >= 0 && data.startIndex < initialItems.length) {
      this.currentIndex.set(data.startIndex);
    }
  }

  readonly currentItem = computed<GalleryItem | null>(() => {
    const list = this.items();
    const idx = this.currentIndex();
    if (list && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  canDelete(): boolean {
    if (this.data?.canEdit !== undefined) {
      return this.data.canEdit;
    }
    const item = this.currentItem();
    const user = this.authService.currentUser();
    if (!item || !user) return false;
    return this.authService.isAdmin() || (item.uploader?.id !== undefined && user.id === item.uploader.id);
  }

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

  // Native Mobile Touch Gestures (Swipe Left -> Next, Swipe Right -> Prev)
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.touchStartTime = Date.now();
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      const deltaX = event.changedTouches[0].clientX - this.touchStartX;
      const deltaY = event.changedTouches[0].clientY - this.touchStartY;
      const elapsedTime = Date.now() - this.touchStartTime;

      // Filter: swipe must be dominantly horizontal and meet threshold to avoid vertical scroll conflict
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.3;
      if (isHorizontal && Math.abs(deltaX) >= 45 && elapsedTime < 650) {
        if (deltaX < 0) {
          this.next();
        } else {
          this.prev();
        }
      }
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(idx => idx - 1);
    }
  }

  next(): void {
    if (this.currentIndex() < this.items().length - 1) {
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

  removeCurrentMedia(): void {
    const item = this.currentItem();
    if (!item || !item.memoryId || !item.id) return;

    if (!window.confirm('Are you sure you want to remove this photo from this memory?')) {
      return;
    }

    this.isDeletingCurrent.set(true);
    this.memoryService.deleteMedia(item.memoryId, item.id).subscribe({
      next: () => {
        this.isDeletingCurrent.set(false);
        this.hasMediaModified.set(true);
        this.snackBar.open('Photo removed from memory.', 'OK', { duration: 3000 });

        const updated = this.items().filter(m => m.id !== item.id);
        this.items.set(updated);

        if (updated.length === 0) {
          this.dialogRef.close({ deleted: true, memoryId: item.memoryId });
        } else {
          if (this.currentIndex() >= updated.length) {
            this.currentIndex.set(updated.length - 1);
          }
        }
      },
      error: (err) => {
        this.isDeletingCurrent.set(false);
        console.error('Failed to remove photo:', err);
        this.snackBar.open('Failed to remove photo. Please try again.', 'Close', { duration: 4000 });
      }
    });
  }

  navigateToMemory(memoryId: string): void {
    this.dialogRef.close({ deleted: this.hasMediaModified(), memoryId });
    this.router.navigate(['/memories', memoryId]);
  }

  onStageClick(event: MouseEvent): void {
    this.closeViewer();
  }

  closeViewer(): void {
    const item = this.currentItem();
    this.dialogRef.close({ deleted: this.hasMediaModified(), memoryId: item?.memoryId });
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
