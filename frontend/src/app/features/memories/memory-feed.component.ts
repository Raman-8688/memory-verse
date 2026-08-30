import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Memory } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';

@Component({
  selector: 'mv-memory-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="feed-page">
      <!-- Header -->
      <div class="feed-header">
        <div class="title-group">
          <span class="sub-heading">Captured Moments</span>
          <h1 class="editorial-title">The Memory Stream</h1>
          <p class="header-desc">
            A chronological tapestry of our photographs, conversations, travels, and late-night adventures.
          </p>
        </div>

        <a mat-flat-button class="add-memory-btn" routerLink="/memories/new">
          <mat-icon>add_photo_alternate</mat-icon>
          <span>Add New Memory</span>
        </a>
      </div>

      <!-- Filters & Search Bar -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search memories...</mat-label>
          <input matInput [(ngModel)]="searchQuery" (keyup.enter)="applyFilters()" placeholder="Title, story, or location">
          <mat-icon matPrefix class="filter-icon">search</mat-icon>
          @if (searchQuery) {
            <button mat-icon-button matSuffix (click)="searchQuery = ''; applyFilters()">
              <mat-icon>clear</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="journey-filter">
          <mat-label>Filter by Journey</mat-label>
          <mat-select [(value)]="selectedJourneyId" (selectionChange)="applyFilters()">
            <mat-option [value]="''">All Journeys</mat-option>
            @for (journey of journeys(); track journey.id) {
              <mat-option [value]="journey.id">{{ journey.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Loading State (Skeleton Grid) -->
      @if (isLoading()) {
        <div class="skeleton-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="skeleton-card">
              <div class="skeleton-thumb skeleton-box"></div>
              <div class="skeleton-info">
                <div class="skeleton-line sm skeleton-box"></div>
                <div class="skeleton-line lg skeleton-box"></div>
                <div class="skeleton-line md skeleton-box"></div>
              </div>
            </div>
          }
        </div>
      } @else if (memories().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>photo_library</mat-icon>
          </div>
          <h3 class="editorial-title">No Memories Found</h3>
          <p>We haven't added any memories matching these criteria yet. Be the first to share one!</p>
          <a mat-flat-button class="add-memory-btn" routerLink="/memories/new">
            <mat-icon>add</mat-icon>
            <span>Add First Memory</span>
          </a>
        </div>
      } @else {
        <!-- Memories Grid -->
        <div class="memories-grid">
          @for (memory of memories(); track memory.id) {
            <article class="memory-card interactive-card" [routerLink]="['/memories', memory.id]">
              <!-- Media Section -->
              <div class="card-media">
                @if (getCoverMedia(memory); as media) {
                  @if (media.mediaType === 'VIDEO') {
                    <video [src]="media.mediaUrl" class="card-img" muted></video>
                    <span class="video-indicator">
                      <mat-icon>play_circle</mat-icon> Video
                    </span>
                  } @else {
                    <img [src]="media.thumbnailUrl || media.mediaUrl" [alt]="memory.title" loading="lazy" class="card-img">
                  }
                } @else {
                  <div class="placeholder-media">
                    <mat-icon>photo</mat-icon>
                  </div>
                }

                <div class="media-overlay"></div>

                <div class="card-pills">
                  <span class="date-pill">
                    <mat-icon>calendar_today</mat-icon>
                    {{ formatDate(memory.memoryDate) }}
                  </span>
                  @if (memory.locationName) {
                    <span class="location-pill">
                      <mat-icon>place</mat-icon>
                      {{ memory.locationName }}
                    </span>
                  }
                </div>
              </div>

              <!-- Content Section -->
              <div class="card-content">
                <div class="journey-ref">
                  <mat-icon>explore</mat-icon>
                  <span>{{ memory.journeyTitle || 'Journey' }}</span>
                  @if (memory.sectionTitle) {
                    <span class="section-ref">/ {{ memory.sectionTitle }}</span>
                  }
                </div>

                <h2 class="card-title">{{ memory.title }}</h2>
                <p class="card-story">{{ memory.story }}</p>

                <!-- Footer with Creator and Tagged Friends -->
                <div class="card-footer">
                  <div class="creator-info">
                    <img [src]="memory.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'" 
                         [alt]="memory.createdBy.fullName" 
                         class="creator-img">
                    <span class="creator-name">{{ memory.createdBy.fullName }}</span>
                  </div>

                  @if (memory.taggedUsers.length > 0) {
                    <div class="tagged-friends-stack" [title]="getTaggedNames(memory)">
                      @for (friend of memory.taggedUsers.slice(0, 3); track friend.id) {
                        <img [src]="friend.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'" 
                             [alt]="friend.fullName" 
                             class="stacked-avatar">
                      }
                      @if (memory.taggedUsers.length > 3) {
                        <span class="more-counter">+{{ memory.taggedUsers.length - 3 }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .feed-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-bottom: var(--space-8);
    }

    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .sub-heading {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.4rem;
      margin: 4px 0 8px 0;
      line-height: 1.1;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.95rem;
      max-width: 650px;
      margin: 0;
      line-height: 1.5;
    }

    .add-memory-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      border-radius: var(--radius-md);
      padding: 0 22px;
      height: 44px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(180, 83, 9, 0.25);
    }

    .filter-bar {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .search-field {
      flex: 2;
      min-width: 260px;
    }

    .journey-filter {
      flex: 1;
      min-width: 200px;
    }

    .filter-icon {
      color: var(--mv-text-muted);
      margin-right: 8px;
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

    .empty-state p {
      color: var(--mv-text-secondary);
      max-width: 440px;
    }

    .memories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--space-4);
    }

    .memory-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-card);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .memory-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: var(--mv-border-focus);
    }

    .card-media {
      position: relative;
      width: 100%;
      height: 240px;
      background-color: #1c1917;
      overflow: hidden;
    }

    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .memory-card:hover .card-img {
      transform: scale(1.04);
    }

    .placeholder-media {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f3ef;
      color: var(--mv-text-muted);
    }

    .video-indicator {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(185, 28, 28, 0.85);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(4px);
    }

    .video-indicator mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .media-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%);
    }

    .card-pills {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .date-pill, .location-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #ffffff;
      background: rgba(28, 25, 23, 0.65);
      backdrop-filter: blur(8px);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .date-pill mat-icon, .location-pill mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .card-content {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .journey-ref {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--mv-primary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .journey-ref mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .section-ref {
      color: var(--mv-text-muted);
    }

    .card-title {
      font-family: var(--font-editorial);
      font-size: 1.35rem;
      font-weight: 600;
      margin: 0 0 6px 0;
      line-height: 1.3;
      color: var(--mv-text-primary);
    }

    .card-story {
      color: var(--mv-text-secondary);
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 var(--space-3) 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--mv-border);
    }

    .creator-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .creator-img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .creator-name {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--mv-text-muted);
    }

    .tagged-friends-stack {
      display: flex;
      align-items: center;
    }

    .stacked-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1.5px solid #ffffff;
      margin-left: -8px;
      object-fit: cover;
    }

    .more-counter {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--mv-bg-subtle);
      border: 1.5px solid #ffffff;
      margin-left: -8px;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mv-text-secondary);
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }

    .skeleton-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      height: 380px;
      display: flex;
      flex-direction: column;
    }

    .skeleton-thumb {
      height: 240px;
      width: 100%;
    }

    .skeleton-info {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .skeleton-line {
      height: 12px;
      border-radius: 4px;
    }

    .skeleton-line.sm {
      width: 40%;
      height: 10px;
    }

    .skeleton-line.lg {
      width: 85%;
      height: 18px;
    }

    .skeleton-line.md {
      width: 65%;
      height: 14px;
    }

    @media (max-width: 640px) {
      .memories-grid, .skeleton-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MemoryFeedComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  private readonly route = inject(ActivatedRoute);

  readonly memories = signal<Memory[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);

  searchQuery = '';
  selectedJourneyId = '';
  selectedSectionId = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['journeyId']) {
        this.selectedJourneyId = params['journeyId'];
      }
      if (params['sectionId']) {
        this.selectedSectionId = params['sectionId'];
      }
      this.loadMemories();
    });

    this.loadJourneys();
  }

  loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (data) => this.journeys.set(data)
    });
  }

  loadMemories(): void {
    this.isLoading.set(true);
    this.memoryService.getMemories({
      journeyId: this.selectedJourneyId || undefined,
      sectionId: this.selectedSectionId || undefined,
      search: this.searchQuery || undefined,
      page: 0,
      size: 30
    }).subscribe({
      next: (res) => {
        this.memories.set(res.content);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load memories:', err);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.loadMemories();
  }

  getCoverMedia(memory: Memory) {
    return memory.mediaList && memory.mediaList.length > 0 ? memory.mediaList[0] : null;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getTaggedNames(memory: Memory): string {
    return 'With: ' + memory.taggedUsers.map(u => u.fullName).join(', ');
  }
}
