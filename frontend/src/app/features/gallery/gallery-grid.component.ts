import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GalleryItem, GalleryFilterParams } from '@core/models/gallery.model';
import { MediaType } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { GalleryService } from '@core/services/gallery.service';
import { JourneyService } from '@core/services/journey.service';
import { DownloadService } from '@core/services/download.service';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';

@Component({
  selector: 'mv-gallery-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="gallery-page">
      <!-- Header -->
      <header class="gallery-header">
        <div class="header-text">
          <span class="sub-label">Visual Vault</span>
          <h1 class="editorial-title">The Media Archive</h1>
          <p class="header-desc">
            A comprehensive, visual stream of every candid photograph, framed memory, and video clip recorded across our journeys.
          </p>
        </div>

        <!-- Filter Controls -->
        <div class="filter-controls">
          <!-- Media Type Toggle Group -->
          <div class="type-toggles">
            <button class="type-toggle-btn" 
                    [class.active]="selectedType() === null" 
                    (click)="setTypeFilter(null)">
              <span>All Media</span>
            </button>
            <button class="type-toggle-btn" 
                    [class.active]="selectedType() === 'IMAGE'" 
                    (click)="setTypeFilter('IMAGE')">
              <mat-icon>photo</mat-icon>
              <span>Photos</span>
            </button>
            <button class="type-toggle-btn" 
                    [class.active]="selectedType() === 'VIDEO'" 
                    (click)="setTypeFilter('VIDEO')">
              <mat-icon>videocam</mat-icon>
              <span>Videos</span>
            </button>
          </div>

          <!-- Journey Filter -->
          <mat-form-field appearance="outline" class="journey-select">
            <mat-label>Filter by Journey</mat-label>
            <mat-select [(value)]="selectedJourneyId" (selectionChange)="loadGallery()">
              <mat-option [value]="''">All Journeys</mat-option>
              @for (journey of journeys(); track journey.id) {
                <mat-option [value]="journey.id">{{ journey.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </header>

      <!-- Media Count Ribbon -->
      <div class="count-ribbon">
        <span>Showing <strong>{{ totalItems() }}</strong> captured {{ totalItems() === 1 ? 'asset' : 'assets' }}</span>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Curating your visual archive...</span>
        </div>
      } @else if (items().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>perm_media</mat-icon>
          </div>
          <h2 class="editorial-title">No Media Found</h2>
          <p>No photos or videos matched your current filter criteria.</p>
          <button mat-flat-button color="primary" (click)="resetFilters()">
            <ng-container>
              <mat-icon>refresh</mat-icon>
              <span>Reset Filters</span>
            </ng-container>
          </button>
        </div>
      } @else {
        <!-- Responsive Media Grid -->
        <div class="media-grid">
          @for (item of items(); track item.id; let i = $index) {
            <div class="gallery-tile" (click)="openLightbox(i)">
              <!-- Thumbnail Media -->
              @if (item.mediaType === 'VIDEO') {
                <video [src]="item.mediaUrl" class="tile-img" muted></video>
                <div class="video-badge">
                  <mat-icon>play_arrow</mat-icon>
                  <span>Video</span>
                </div>
              } @else {
                <img [src]="item.thumbnailUrl || item.mediaUrl" 
                     [alt]="item.memoryTitle || 'Photograph'" 
                     loading="lazy" 
                     class="tile-img">
              }

              <!-- Hover Gradient & Details Overlay -->
              <div class="tile-overlay">
                <div class="overlay-top">
                  @if (item.journeyTitle) {
                    <span class="journey-tag">{{ item.journeyTitle }}</span>
                  }
                  <button mat-icon-button class="tile-dl-btn" 
                          (click)="$event.stopPropagation(); downloadMedia(item)" 
                          [disabled]="downloadService.isDownloading(item.mediaUrl)"
                          title="Download high-quality file">
                    @if (downloadService.isDownloading(item.mediaUrl)) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      <mat-icon>download</mat-icon>
                    }
                  </button>
                </div>

                <div class="overlay-bottom">
                  <h4 class="tile-title">{{ item.memoryTitle || 'Captured Moment' }}</h4>
                  <div class="tile-meta">
                    <span>{{ formatDate(item.memoryDate) }}</span>
                    @if (item.uploader; as uploader) {
                      <span class="dot">•</span>
                      <span>{{ uploader.fullName }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .gallery-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .gallery-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: var(--space-4);
    }

    .sub-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--mv-primary);
    }

    .editorial-title {
      font-size: 2.6rem;
      margin: 4px 0 8px 0;
      line-height: 1.1;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.95rem;
      max-width: 620px;
      margin: 0;
      line-height: 1.5;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .type-toggles {
      display: flex;
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 3px;
    }

    .type-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--mv-text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .type-toggle-btn:hover {
      color: var(--mv-text-primary);
    }

    .type-toggle-btn.active {
      background-color: #ffffff;
      color: var(--mv-primary);
      box-shadow: var(--shadow-subtle);
    }

    .type-toggle-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .journey-select {
      width: 220px;
      margin-bottom: -1.25em;
    }

    .count-ribbon {
      font-size: 0.85rem;
      color: var(--mv-text-secondary);
    }

    .count-ribbon strong {
      color: var(--mv-text-primary);
    }

    /* Responsive Justified Grid */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }

    .gallery-tile {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      aspect-ratio: 4 / 3;
      background-color: #1c1917;
      cursor: pointer;
      border: 1px solid var(--mv-border);
      box-shadow: var(--shadow-subtle);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .gallery-tile:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: var(--mv-border-focus);
    }

    .tile-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .gallery-tile:hover .tile-img {
      transform: scale(1.05);
    }

    .video-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(185, 28, 28, 0.85);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 2px;
      backdrop-filter: blur(6px);
      z-index: 2;
    }

    .video-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .tile-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12px;
      z-index: 1;
    }

    .gallery-tile:hover .tile-overlay {
      opacity: 1;
    }

    .overlay-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .tile-dl-btn {
      width: 32px !important;
      height: 32px !important;
      color: #ffffff !important;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
      margin-left: auto;
      &:hover {
        background: rgba(0, 0, 0, 0.85);
      }
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      ::ng-deep circle {
        stroke: #ffffff !important;
      }
    }

    .journey-tag {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #fef3c7;
      background: rgba(0, 0, 0, 0.5);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      backdrop-filter: blur(4px);
    }

    .tile-title {
      font-family: var(--font-editorial);
      font-size: 1.1rem;
      color: #ffffff;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tile-meta {
      font-size: 0.72rem;
      color: #d6d3d1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dot {
      color: #78716c;
    }

    .loading-state, .empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    @media (max-width: 640px) {
      .media-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .journey-select {
        width: 100%;
      }
    }
  `]
})
export class GalleryGridComponent implements OnInit {
  private readonly galleryService = inject(GalleryService);
  private readonly journeyService = inject(JourneyService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<GalleryItem[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly selectedType = signal<MediaType | null>(null);
  readonly totalItems = signal<number>(0);
  readonly isLoading = signal<boolean>(true);

  selectedJourneyId = '';

  ngOnInit(): void {
    this.loadJourneys();
    this.loadGallery();
  }

  loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (data) => this.journeys.set(data)
    });
  }

  loadGallery(): void {
    this.isLoading.set(true);

    const params: GalleryFilterParams = {
      journeyId: this.selectedJourneyId || undefined,
      mediaType: this.selectedType() || undefined,
      page: 0,
      size: 60,
      sortBy: 'createdAt',
      sortDirection: 'DESC'
    };

    this.galleryService.getGallery(params).subscribe({
      next: (res) => {
        this.items.set(res.content);
        this.totalItems.set(res.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load gallery:', err);
        this.isLoading.set(false);
      }
    });
  }

  setTypeFilter(type: MediaType | null): void {
    this.selectedType.set(type);
    this.loadGallery();
  }

  resetFilters(): void {
    this.selectedType.set(null);
    this.selectedJourneyId = '';
    this.loadGallery();
  }

  openLightbox(startIndex: number): void {
    const data: MediaViewerData = {
      items: this.items(),
      startIndex
    };

    this.dialog.open(MediaViewerModalComponent, {
      data,
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  readonly downloadService = inject(DownloadService);

  async downloadMedia(item: GalleryItem): Promise<void> {
    const ext = item.mediaType === 'VIDEO' ? '.mp4' : '.jpg';
    let base = item.memoryTitle ? item.memoryTitle.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'memory';
    while (base.includes('__')) base = base.replace('__', '_');
    const fileName = `${base}${ext}`;
    await this.downloadService.downloadMedia(item.mediaUrl, fileName);
  }
}
