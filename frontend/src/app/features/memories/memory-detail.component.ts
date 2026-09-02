import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Memory, Media } from '@core/models/memory.model';
import { GalleryItem } from '@core/models/gallery.model';
import { MemoryService } from '@core/services/memory.service';
import { AuthService } from '@core/auth/auth.service';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MemoryEditDialogComponent } from './memory-edit-dialog.component';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';
import { NotificationStateService } from '@core/services/notification-state.service';

@Component({
  selector: 'mv-memory-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ImageFallbackDirective
  ],
  templateUrl: './memory-detail.component.html',
  styleUrl: './memory-detail.component.scss'
})
export class MemoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memoryService = inject(MemoryService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly memory = signal<Memory | null>(null);
  readonly activeMedia = signal<Media | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isUploadingMedia = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadMemory(id);
      }
    });
  }

  loadMemory(id: string): void {
    this.isLoading.set(true);
    this.memoryService.getMemoryById(id).subscribe({
      next: (data: Memory) => {
        this.memory.set(data);
        if (data.mediaList && data.mediaList.length > 0) {
          this.activeMedia.set(data.mediaList[0]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load memory:', err);
        this.isLoading.set(false);
      }
    });
  }

  setActiveMedia(media: Media): void {
    this.activeMedia.set(media);
  }

  openLightbox(startIndex: number = 0): void {
    const mem = this.memory();
    if (!mem || !mem.mediaList || mem.mediaList.length === 0) return;

    const galleryItems: GalleryItem[] = mem.mediaList.map(m => ({
      id: m.id,
      mediaUrl: m.mediaUrl,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType,
      fileName: m.fileName,
      width: m.width,
      height: m.height,
      durationSeconds: m.durationSeconds,
      displayOrder: m.displayOrder,
      memoryId: mem.id,
      memoryTitle: mem.title,
      memoryDate: mem.memoryDate,
      locationName: mem.locationName,
      journeyId: mem.journeyId,
      journeyTitle: mem.journeyTitle,
      uploader: mem.createdBy,
      taggedUsers: mem.taggedUsers,
      createdAt: m.createdAt
    }));

    this.dialog.open(MediaViewerModalComponent, {
      data: { items: galleryItems, startIndex },
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  canEdit(): boolean {
    const user = this.authService.currentUser();
    const m = this.memory();
    if (!user || !m) return false;
    return user.id === m.createdBy?.id || this.authService.isAdmin();
  }

  openEditDialog(m: Memory): void {
    const ref = this.dialog.open(MemoryEditDialogComponent, {
      data: m,
      width: '580px'
    });

    ref.afterClosed().subscribe((updated: Memory | undefined) => {
      if (updated) {
        this.memory.update(curr => curr ? {
          ...curr,
          ...updated,
          mediaList: curr.mediaList,
          taggedUsers: curr.taggedUsers
        } : updated);
        this.notificationState.refresh();
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    const m = this.memory();
    if (!m) return;

    this.isUploadingMedia.set(true);
    this.uploadProgress.set(0);

    this.memoryService.appendMediaWithProgress(m.id, files).subscribe({
      next: (httpEvent) => {
        if (httpEvent.type === HttpEventType.UploadProgress) {
          if (httpEvent.total) {
            const progress = Math.round((100 * httpEvent.loaded) / httpEvent.total);
            this.uploadProgress.set(progress);
          }
        } else if (httpEvent.type === HttpEventType.Response) {
          this.isUploadingMedia.set(false);
          const updatedMemory: Memory = httpEvent.body?.data || httpEvent.body;
          if (updatedMemory) {
            this.memory.set(updatedMemory);
            if (!this.activeMedia() && updatedMemory.mediaList?.length > 0) {
              this.activeMedia.set(updatedMemory.mediaList[0]);
            }
          }
          this.notificationState.refresh();
          this.snackBar.open(`${files.length} photo(s) added successfully!`, 'OK', { duration: 3500 });
          input.value = '';
        }
      },
      error: (err) => {
        this.isUploadingMedia.set(false);
        console.error('Failed to append media:', err);
        const msg = err.error?.message || 'Failed to upload photos. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        input.value = '';
      }
    });
  }
}
