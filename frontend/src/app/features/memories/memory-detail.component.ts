import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Memory, Media } from '@core/models/memory.model';
import { GalleryItem } from '@core/models/gallery.model';
import { MemoryService } from '@core/services/memory.service';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';

@Component({
  selector: 'mv-memory-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    @if (isLoading()) {
      <div class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Loading memory details...</span>
      </div>
    } @else {
      @if (memory(); as m) {
        <div class="memory-detail-page">
          <!-- Back Link -->
          <a routerLink="/memories" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            <span>All Memories</span>
          </a>

          <!-- Primary Hero Media Showcase -->
          @if (activeMedia(); as hero) {
            <div class="hero-media-container" (click)="openLightbox(0)" style="cursor: pointer;" title="Click to view fullscreen">
              @if (hero.mediaType === 'VIDEO') {
                <video [src]="hero.mediaUrl" controls class="hero-media-element" autoplay [muted]="true"></video>
              } @else {
                <img [src]="hero.mediaUrl" [alt]="m.title" class="hero-media-element">
              }
            </div>
          }

          <!-- Story Article Header -->
          <header class="story-header">
            <div class="journey-breadcrumbs">
              <a [routerLink]="['/journeys', m.journeyId]" class="crumb-link">
                <mat-icon>explore</mat-icon>
                <span>{{ m.journeyTitle || 'Journey' }}</span>
              </a>
              @if (m.sectionTitle) {
                <span class="crumb-divider">/</span>
                <span class="crumb-current">{{ m.sectionTitle }}</span>
              }
            </div>

            <h1 class="story-title">{{ m.title }}</h1>

            <div class="story-meta-bar">
              <div class="meta-item">
                <mat-icon>calendar_today</mat-icon>
                <span>{{ formatDate(m.memoryDate) }}</span>
              </div>

              @if (m.locationName) {
                <div class="meta-item">
                  <mat-icon>place</mat-icon>
                  <span>{{ m.locationName }}</span>
                </div>
              }

              <div class="meta-item author">
                <img [src]="m.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'" 
                     [alt]="m.createdBy.fullName" 
                     class="author-avatar">
                <span>Shared by <strong>{{ m.createdBy.fullName }}</strong></span>
              </div>
            </div>
          </header>

          <!-- Story Narrative Content -->
          <article class="story-narrative-card">
            <div class="narrative-body">
              {{ m.story }}
            </div>

            <!-- Tagged Friends -->
            @if (m.taggedUsers.length > 0) {
              <div class="tagged-section">
                <div class="tagged-heading">Friends in this memory:</div>
                <div class="tagged-chips">
                  @for (user of m.taggedUsers; track user.id) {
                    <div class="friend-pill">
                      <img [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'" 
                           [alt]="user.fullName" 
                           class="friend-pill-avatar">
                      <span>{{ user.fullName }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </article>

          <!-- Media Gallery Grid (If memory has more than 1 asset) -->
          @if (m.mediaList.length > 1) {
            <section class="gallery-section">
              <div class="gallery-heading">
                <h2 class="editorial-title">Gallery Assets ({{ m.mediaList.length }})</h2>
                <p>Click any photo or video to spotlight it in the player above.</p>
              </div>

              <div class="gallery-grid">
                @for (media of m.mediaList; track media.id) {
                  <div class="gallery-thumb" 
                       [class.active]="activeMedia()?.id === media.id"
                       (click)="setActiveMedia(media)">
                    @if (media.mediaType === 'VIDEO') {
                      <video [src]="media.mediaUrl" class="thumb-img" muted></video>
                      <span class="video-pill">
                        <mat-icon>play_arrow</mat-icon>
                      </span>
                    } @else {
                      <img [src]="media.thumbnailUrl || media.mediaUrl" [alt]="media.fileName || 'photo'" class="thumb-img">
                    }
                  </div>
                }
              </div>
            </section>
          }
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>error_outline</mat-icon>
          <h2>Memory Not Found</h2>
          <p>The memory you are looking for does not exist or has been removed.</p>
          <a mat-flat-button color="primary" routerLink="/memories">Back to Memories</a>
        </div>
      }
    }
  `,
  styles: [`
    .memory-detail-page {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--mv-text-secondary);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      transition: color 0.2s;
      width: fit-content;
    }

    .back-link:hover {
      color: var(--mv-primary);
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .hero-media-container {
      width: 100%;
      max-height: 540px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background-color: #000000;
      box-shadow: var(--shadow-card);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero-media-element {
      width: 100%;
      height: 100%;
      max-height: 540px;
      object-fit: contain;
    }

    .story-header {
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
    }

    .journey-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .crumb-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--mv-primary);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .crumb-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .crumb-divider {
      color: var(--mv-text-muted);
      font-size: 0.8rem;
    }

    .crumb-current {
      font-size: 0.8rem;
      color: var(--mv-text-secondary);
      font-weight: 500;
    }

    .story-title {
      font-family: var(--font-editorial);
      font-size: 2.8rem;
      font-weight: 700;
      margin: 0 0 var(--space-2) 0;
      line-height: 1.15;
      color: var(--mv-text-primary);
    }

    .story-meta-bar {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
      font-size: 0.85rem;
      color: var(--mv-text-secondary);
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .meta-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mv-primary);
    }

    .author-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      object-fit: cover;
    }

    .story-narrative-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      padding: var(--space-6);
      box-shadow: var(--shadow-card);
    }

    .narrative-body {
      font-family: var(--font-ui);
      font-size: 1.1rem;
      line-height: 1.8;
      color: var(--mv-text-primary);
      white-space: pre-line;
      margin-bottom: var(--space-4);
    }

    .tagged-section {
      padding-top: var(--space-3);
      border-top: 1px solid var(--mv-border);
    }

    .tagged-heading {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mv-text-muted);
      margin-bottom: 10px;
    }

    .tagged-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .friend-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--mv-text-primary);
    }

    .friend-pill-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
    }

    .gallery-section {
      margin-top: var(--space-2);
    }

    .gallery-heading {
      margin-bottom: var(--space-3);
    }

    .gallery-heading .editorial-title {
      font-size: 1.8rem;
      margin: 0 0 4px 0;
    }

    .gallery-heading p {
      margin: 0;
      color: var(--mv-text-muted);
      font-size: 0.88rem;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .gallery-thumb {
      height: 120px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 2px solid var(--mv-border);
      cursor: pointer;
      position: relative;
      background-color: #000000;
      transition: all 0.2s ease;
    }

    .gallery-thumb:hover {
      transform: translateY(-2px);
      border-color: var(--mv-primary);
    }

    .gallery-thumb.active {
      border-color: var(--mv-primary);
      box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.3);
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-pill {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .video-pill mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .loading-state, .empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .story-title {
        font-size: 2rem;
      }
      .story-narrative-card {
        padding: var(--space-4);
      }
    }
  `]
})
export class MemoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memoryService = inject(MemoryService);

  readonly memory = signal<Memory | null>(null);
  readonly activeMedia = signal<Media | null>(null);
  readonly isLoading = signal<boolean>(true);

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
      next: (data) => {
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

  private readonly dialog = inject(MatDialog);

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
