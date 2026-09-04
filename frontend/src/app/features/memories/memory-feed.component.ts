import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { Memory, MediaType } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';

export interface MonthGroup {
  periodKey: string;
  periodLabel: string;
  memories: Memory[];
}

@Component({
  selector: 'mv-memory-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './memory-feed.component.html',
  styleUrl: './memory-feed.component.scss'
})
export class MemoryFeedComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  private readonly route = inject(ActivatedRoute);

  readonly memories = signal<Memory[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);

  // View Mode: 'feed' (editorial cards) vs 'grid' (compact photo tiles)
  readonly viewMode = signal<'feed' | 'grid'>('feed');

  // Filters State
  searchQuery: string = '';
  selectedJourneyId: string = '';
  selectedMediaType: MediaType | '' = '';

  // Chronological Grouping
  readonly groupedMemories = computed<MonthGroup[]>(() => {
    const list = this.memories();
    if (!list || list.length === 0) return [];

    const map = new Map<string, MonthGroup>();

    list.forEach(m => {
      const date = m.memoryDate ? new Date(m.memoryDate) : new Date(m.createdAt);
      const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
      const monthName = isNaN(date.getTime()) ? 'Recent' : date.toLocaleDateString('en-US', { month: 'long' });
      const periodKey = `${year}-${date.getMonth()}`;
      const periodLabel = `${monthName} ${year}`;

      if (!map.has(periodKey)) {
        map.set(periodKey, {
          periodKey,
          periodLabel,
          memories: []
        });
      }
      map.get(periodKey)!.memories.push(m);
    });

    return Array.from(map.values());
  });

  ngOnInit(): void {
    this.loadJourneys();

    // Check query params if navigated from a journey or places link
    this.route.queryParamMap.subscribe(params => {
      const jId = params.get('journeyId');
      if (jId) {
        this.selectedJourneyId = jId;
      }
      const view = params.get('view');
      if (view === 'grid') {
        this.viewMode.set('grid');
      }
      this.loadMemories();
    });
  }

  loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (data) => this.journeys.set(data),
      error: (err) => console.error('Failed to load journeys:', err)
    });
  }

  loadMemories(): void {
    this.isLoading.set(true);
    this.memoryService.getMemories({
      journeyId: this.selectedJourneyId || undefined,
      search: this.searchQuery?.trim() || undefined,
      sortBy: 'memoryDate',
      sortDirection: 'DESC'
    }).subscribe({
      next: (res) => {
        let items = res.content || [];
        if (this.selectedMediaType) {
          items = items.filter(m => m.mediaList && m.mediaList.some(med => med.mediaType === this.selectedMediaType));
        }
        this.memories.set(items);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load memories:', err);
        this.isLoading.set(false);
      }
    });
  }

  setViewMode(mode: 'feed' | 'grid'): void {
    this.viewMode.set(mode);
  }

  selectJourney(journeyId: string): void {
    this.selectedJourneyId = journeyId;
    this.loadMemories();
  }

  selectMediaType(type: MediaType | ''): void {
    this.selectedMediaType = type;
    this.loadMemories();
  }

  applyFilters(): void {
    this.loadMemories();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedJourneyId = '';
    this.selectedMediaType = '';
    this.loadMemories();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getCoverUrl(memory?: Memory): string {
    if (!memory) return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
    if (memory.coverImageUrl) return memory.coverImageUrl;
    if (memory.mediaList && memory.mediaList.length > 0) {
      const media = memory.mediaList[0];
      return media.thumbnailUrl || media.mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
  }
}
