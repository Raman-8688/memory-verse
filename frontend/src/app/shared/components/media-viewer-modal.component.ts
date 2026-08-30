import { Component, HostListener, Inject, inject, signal } from '@angular/core';
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
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="lightbox-overlay">
      <!-- Top Navigation & Controls Bar -->
      <div class="top-bar">
        <div class="counter-badge">
          <span>{{ currentIndex() + 1 }}</span>
          <span class="divider">/</span>
          <span>{{ data.items.length }}</span>
        </div>

        <div class="top-actions">
          <button mat-icon-button class="control-btn" (click)="downloadCurrentMedia()" [disabled]="isDownloadingCurrent()" title="Download High Quality File" aria-label="Download media">
            @if (isDownloadingCurrent()) {
              <mat-spinner diameter="18" class="download-spinner"></mat-spinner>
            } @else {
              <mat-icon>download</mat-icon>
            }
          </button>
          <button mat-icon-button class="control-btn" (click)="closeViewer()" aria-label="Close viewer">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Stage -->
      <div class="main-stage">
        <!-- Previous Chevron Button -->
        <button mat-icon-button class="nav-chevron left" (click)="prev()" [disabled]="currentIndex() === 0" aria-label="Previous media">
          <mat-icon>chevron_left</mat-icon>
        </button>

        <!-- Active Media Display -->
        @if (currentItem(); as item) {
          <div class="media-frame">
            @if (item.mediaType === 'VIDEO') {
              <video [src]="item.mediaUrl" controls autoplay class="stage-element video-element"></video>
            } @else {
              <img [src]="item.mediaUrl" [alt]="item.memoryTitle || 'Photograph'" class="stage-element img-element">
            }
          </div>
        }

        <!-- Next Chevron Button -->
        <button mat-icon-button class="nav-chevron right" (click)="next()" [disabled]="currentIndex() >= data.items.length - 1" aria-label="Next media">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <!-- Bottom Editorial Overlay Drawer -->
      @if (currentItem(); as item) {
        <div class="bottom-overlay-drawer">
          <div class="drawer-left">
            @if (item.uploader; as uploader) {
              <img [src]="uploader.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'" 
                   [alt]="uploader.fullName" 
                   class="uploader-avatar">
              <div class="uploader-info">
                <span class="uploader-name">{{ uploader.fullName }}</span>
                <span class="memory-meta">
                  {{ formatDate(item.memoryDate) }}
                  @if (item.locationName) {
                    • {{ item.locationName }}
                  }
                </span>
              </div>
            }
          </div>

          <div class="drawer-center">
            <h3 class="overlay-title">{{ item.memoryTitle || 'Untitled Moment' }}</h3>
            @if (item.journeyTitle) {
              <span class="overlay-journey">{{ item.journeyTitle }}</span>
            }
          </div>

          <div class="drawer-right">
            @if (item.memoryId) {
              <button mat-flat-button class="view-story-btn" (click)="navigateToMemory(item.memoryId)">
                <ng-container>
                  <span>View Story</span>
                  <mat-icon>arrow_forward</mat-icon>
                </ng-container>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
    }

    .lightbox-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(10, 9, 8, 0.97);
      backdrop-filter: blur(20px);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      user-select: none;
    }

    .top-bar {
      height: 64px;
      padding: 0 var(--space-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1010;
    }

    .counter-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #e7e5e4;
      font-size: 0.88rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      letter-spacing: 0.05em;
    }

    .divider {
      color: #78716c;
    }

    .control-btn {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.1);
      transition: background 0.2s;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .main-stage {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-3);
      position: relative;
      overflow: hidden;
    }

    .media-frame {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      box-sizing: border-box;
    }

    .stage-element {
      max-width: 90vw;
      max-height: calc(100vh - 170px);
      object-fit: contain;
      border-radius: var(--radius-md);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      transition: opacity 0.25s ease;
    }

    .video-element {
      background-color: #000000;
      width: 100%;
      max-width: 960px;
    }

    .nav-chevron {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.12) !important;
      backdrop-filter: blur(8px);
      width: 52px !important;
      height: 52px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      z-index: 1010;
    }

    .nav-chevron:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25) !important;
      transform: scale(1.08);
    }

    .nav-chevron:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }

    .nav-chevron mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .bottom-overlay-drawer {
      height: 80px;
      background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%);
      padding: 0 var(--space-6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1010;
      gap: var(--space-4);
    }

    .drawer-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }

    .uploader-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--mv-primary);
    }

    .uploader-info {
      display: flex;
      flex-direction: column;
    }

    .uploader-name {
      font-weight: 600;
      color: #ffffff;
      font-size: 0.9rem;
    }

    .memory-meta {
      font-size: 0.75rem;
      color: #a8a29e;
    }

    .drawer-center {
      text-align: center;
      flex: 1;
      max-width: 600px;
    }

    .overlay-title {
      font-family: var(--font-editorial);
      font-size: 1.35rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-journey {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .drawer-right {
      min-width: 200px;
      display: flex;
      justify-content: flex-end;
    }

    .view-story-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    @media (max-width: 768px) {
      .drawer-center {
        display: none;
      }
      .nav-chevron {
        width: 40px !important;
        height: 40px !important;
      }
      .nav-chevron mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .download-spinner ::ng-deep circle {
      stroke: #ffffff !important;
    }
  `]
})
export class MediaViewerModalComponent {
  readonly dialogRef = inject(MatDialogRef<MediaViewerModalComponent>);
  readonly downloadService = inject(DownloadService);
  private readonly router = inject(Router);

  readonly currentIndex = signal<number>(0);

  constructor(@Inject(MAT_DIALOG_DATA) public data: MediaViewerData) {
    if (data && data.startIndex !== undefined) {
      this.currentIndex.set(data.startIndex);
    }
  }

  isDownloadingCurrent(): boolean {
    const item = this.currentItem();
    return item ? this.downloadService.isDownloading(item.mediaUrl) : false;
  }

  async downloadCurrentMedia(): Promise<void> {
    const item = this.currentItem();
    if (!item) return;

    const ext = item.mediaType === 'VIDEO' ? '.mp4' : '.jpg';
    let base = item.memoryTitle ? item.memoryTitle.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'memory';
    while (base.includes('__')) base = base.replace('__', '_');
    const fileName = `${base}${ext}`;

    await this.downloadService.downloadMedia(item.mediaUrl, fileName);
  }

  currentItem(): GalleryItem | null {
    if (!this.data.items || this.data.items.length === 0) return null;
    return this.data.items[this.currentIndex()] || null;
  }

  next(): void {
    if (this.currentIndex() < this.data.items.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  closeViewer(): void {
    this.dialogRef.close();
  }

  navigateToMemory(memoryId: string): void {
    this.dialogRef.close();
    this.router.navigate(['/memories', memoryId]);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.next();
    } else if (event.key === 'ArrowLeft') {
      this.prev();
    } else if (event.key === 'Escape') {
      this.closeViewer();
    }
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
