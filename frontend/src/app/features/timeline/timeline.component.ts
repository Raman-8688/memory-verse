import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { Memory, MemoryFilterParams } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { PagedResponse } from '@core/models/api-response.model';
import { AddToCollectionDialogComponent } from '@shared/components/add-to-collection-dialog/add-to-collection-dialog.component';
import { LightboxService } from '@core/services/lightbox.service';
import { AiSearchService } from '@core/services/ai-search.service';
import { optimizeCloudinaryUrl } from '@shared/pipes/cloudinary-optimize.pipe';

export interface SmartFilterChip {
  id: string;
  type: 'person' | 'place' | 'year' | 'journey' | 'search';
  label: string;
  value: any;
  icon: string;
}

export interface TimelineMonthGroup {

  monthKey: string;
  monthName: string;
  month: number;
  memories: Memory[];
}

export interface TimelineYearGroup {
  year: number;
  months: TimelineMonthGroup[];
  totalMemories: number;
}

@Component({
  selector: 'mv-timeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent implements OnInit, OnDestroy {
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  readonly captureService = inject(MediaCaptureService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly lightboxService = inject(LightboxService);
  private readonly aiSearchService = inject(AiSearchService);

  // Unified Smart Search & Filter Intent Signals
  readonly smartSearchText = signal<string>('');
  readonly isExtractingIntent = signal<boolean>(false);
  readonly smartChips = signal<SmartFilterChip[]>([]);

  // State Signals
  readonly memories = signal<Memory[]>([]);
  readonly availableYears = signal<number[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);

  // Pagination State
  readonly currentPage = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);
  readonly isLastPage = signal<boolean>(true);
  readonly pageSize = 15;

  // Filter Signals (Synchronized with URL)
  readonly selectedYear = signal<number | null>(null);
  readonly selectedMonth = signal<number | null>(null);
  readonly selectedJourneyId = signal<string | null>(null);
  readonly selectedSectionId = signal<string | null>(null);
  readonly selectedPlace = signal<string | null>(null);
  readonly selectedPersonId = signal<string | null>(null);
  readonly searchInput = signal<string>('');

  readonly selectedJourneyTitle = computed<string | null>(() => {
    const jId = this.selectedJourneyId();
    if (!jId) return null;
    const match = this.journeys().find(j => j.id === jId);
    return match ? match.title : 'Selected Journey';
  });

  readonly monthsList = [
    { value: 1, name: 'Jan' },
    { value: 2, name: 'Feb' },
    { value: 3, name: 'Mar' },
    { value: 4, name: 'Apr' },
    { value: 5, name: 'May' },
    { value: 6, name: 'Jun' },
    { value: 7, name: 'Jul' },
    { value: 8, name: 'Aug' },
    { value: 9, name: 'Sep' },
    { value: 10, name: 'Oct' },
    { value: 11, name: 'Nov' },
    { value: 12, name: 'Dec' }
  ];

  // Active filters count for badge
  readonly activeFilterCount = computed<number>(() => {
    let count = 0;
    if (this.selectedYear() !== null) count++;
    if (this.selectedMonth() !== null) count++;
    if (this.selectedJourneyId() !== null) count++;
    if (this.selectedSectionId() !== null) count++;
    if (this.selectedPlace() !== null) count++;
    if (this.selectedPersonId() !== null) count++;
    if (this.searchInput().trim() !== '') count++;
    return count;
  });

  // Chronologically Grouped Timeline (Year -> Month -> Memories)
  readonly groupedTimeline = computed<TimelineYearGroup[]>(() => {
    const items = this.memories();
    if (!items || items.length === 0) return [];

    const yearMap = new Map<number, Map<string, Memory[]>>();

    for (const memory of items) {
      const d = new Date(memory.memoryDate);
      const year = isNaN(d.getFullYear()) ? 1970 : d.getFullYear();
      const month = isNaN(d.getMonth()) ? 0 : d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(memory);
    }

    const result: TimelineYearGroup[] = [];
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    for (const year of sortedYears) {
      const monthMap = yearMap.get(year)!;
      const months: TimelineMonthGroup[] = [];
      let yearTotal = 0;

      const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

      for (const key of sortedMonthKeys) {
        const mems = monthMap.get(key)!;
        yearTotal += mems.length;
        const monthNum = parseInt(key.split('-')[1], 10);
        const dateObj = new Date(year, monthNum - 1, 1);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        months.push({
          monthKey: key,
          monthName,
          month: monthNum,
          memories: mems
        });
      }

      result.push({
        year,
        months,
        totalMemories: yearTotal
      });
    }

    return result;
  });

  private querySub?: Subscription;

  ngOnInit(): void {
    this.loadFilterMetadata();

    // Listen to query param changes (for Back/Forward and deep links)
    this.querySub = this.route.queryParams.subscribe(params => {
      const yearParam = params['year'] ? parseInt(params['year'], 10) : null;
      const monthParam = params['month'] ? parseInt(params['month'], 10) : null;
      const journeyParam = params['journey'] || params['journeyId'] || null;
      const sectionParam = params['section'] || params['sectionId'] || params['chapter'] || null;
      const placeParam = params['place'] || null;
      const personParam = params['person'] || params['userId'] || null;
      const searchParam = params['search'] || '';

      const isSameFilter =
        this.selectedYear() === yearParam &&
        this.selectedMonth() === monthParam &&
        this.selectedJourneyId() === journeyParam &&
        this.selectedSectionId() === sectionParam &&
        this.selectedPlace() === placeParam &&
        this.selectedPersonId() === personParam &&
        this.searchInput() === searchParam;

      if (isSameFilter && this.memories().length > 0) {
        return;
      }

      this.selectedYear.set(yearParam);
      this.selectedMonth.set(monthParam);
      this.selectedJourneyId.set(journeyParam);
      this.selectedSectionId.set(sectionParam);
      this.selectedPlace.set(placeParam);
      this.selectedPersonId.set(personParam);
      this.searchInput.set(searchParam);

      this.syncChipsFromState();
      this.fetchTimeline(0, false);
    });

  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  private loadFilterMetadata(): void {
    this.memoryService.getMemoryYears().subscribe({
      next: (years) => {
        if (years && years.length > 0) {
          this.availableYears.set(years);
        }
      },
      error: () => {}
    });

    this.journeyService.getJourneys().subscribe({
      next: (journeys) => {
        this.journeys.set(journeys || []);
      },
      error: () => {}
    });
  }

  fetchTimeline(page: number, append: boolean): void {
    if (page === 0) {
      this.isLoading.set(true);
      this.hasError.set(false);
    } else {
      this.isLoadingMore.set(true);
    }

    const params: MemoryFilterParams = {
      page,
      size: this.pageSize,
      sortBy: 'memoryDate',
      sortDirection: 'DESC'
    };

    if (this.selectedYear() !== null) {
      params.year = this.selectedYear()!;
    }
    if (this.selectedMonth() !== null) {
      params.month = this.selectedMonth()!;
    }
    if (this.selectedJourneyId()) {
      params.journeyId = this.selectedJourneyId()!;
    }
    if (this.selectedSectionId()) {
      params.sectionId = this.selectedSectionId()!;
    }
    if (this.selectedPlace()) {
      params.place = this.selectedPlace()!;
    }
    if (this.selectedPersonId()) {
      params.userId = this.selectedPersonId()!;
    }
    const term = this.searchInput().trim();
    if (term) {
      params.search = term;
    }

    this.memoryService.getMemories(params).subscribe({
      next: (res: PagedResponse<Memory>) => {
        if (append) {
          this.memories.update(current => [...current, ...(res.content || [])]);
        } else {
          this.memories.set(res.content || []);
        }

        this.currentPage.set(res.page);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.isLastPage.set(res.last);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  loadMore(): void {
    if (this.isLastPage() || this.isLoadingMore()) return;
    this.fetchTimeline(this.currentPage() + 1, true);
  }

  // Filter Actions
  onYearSelect(year: number | null): void {
    this.updateUrlParams({
      year: year,
      month: null // Reset month when year changes
    });
  }

  onMonthSelect(month: number | null): void {
    this.updateUrlParams({
      month: month
    });
  }

  onJourneySelect(journeyId: string | null): void {
    this.updateUrlParams({
      journey: journeyId
    });
  }

  // Smart Filter Bar Actions
  onSmartSearchSubmit(): void {
    const text = this.smartSearchText().trim();
    if (!text || this.isExtractingIntent()) return;

    this.isExtractingIntent.set(true);

    this.aiSearchService.getSearchSummary(text).subscribe({
      next: (summary) => {
        this.isExtractingIntent.set(false);
        const filters = summary.activeFilters;
        const urlParams: Record<string, any> = {};

        // 1. Year / Relative date
        if (filters.dateStart) {
          const y = parseInt(filters.dateStart.split('-')[0], 10);
          if (!isNaN(y)) {
            this.selectedYear.set(y);
            urlParams['year'] = y;
          }
        }

        // 2. Location
        if (filters.location) {
          this.selectedPlace.set(filters.location);
          urlParams['place'] = filters.location;
        }

        // 3. Person or Keywords
        if (filters.personName) {
          this.searchInput.set(filters.personName);
          urlParams['search'] = filters.personName;
        } else if (filters.keywords && filters.keywords.length > 0) {
          const kw = filters.keywords.join(' ');
          this.searchInput.set(kw);
          urlParams['search'] = kw;
        } else if (!filters.location && !filters.dateStart) {
          this.searchInput.set(text);
          urlParams['search'] = text;
        }

        this.smartSearchText.set('');
        this.updateUrlParams(urlParams);
      },
      error: (err) => {
        this.isExtractingIntent.set(false);
        console.warn('Smart filter extraction error, applying literal search:', err);
        this.searchInput.set(text);
        this.smartSearchText.set('');
        this.updateUrlParams({ search: text });
      }
    });
  }

  removeSmartChip(chip: SmartFilterChip): void {
    const urlUpdates: Record<string, any> = {};

    switch (chip.type) {
      case 'year':
        this.selectedYear.set(null);
        this.selectedMonth.set(null);
        urlUpdates['year'] = null;
        urlUpdates['month'] = null;
        break;
      case 'place':
        this.selectedPlace.set(null);
        urlUpdates['place'] = null;
        break;
      case 'person':
      case 'search':
        this.searchInput.set('');
        urlUpdates['search'] = null;
        break;
      case 'journey':
        this.selectedJourneyId.set(null);
        this.selectedSectionId.set(null);
        urlUpdates['journey'] = null;
        urlUpdates['section'] = null;
        break;
    }

    this.updateUrlParams(urlUpdates);
  }

  private syncChipsFromState(): void {
    const chips: SmartFilterChip[] = [];

    const yr = this.selectedYear();
    if (yr !== null) {
      chips.push({
        id: 'year',
        type: 'year',
        label: `Year: ${yr}`,
        value: yr,
        icon: 'calendar_today'
      });
    }

    const pl = this.selectedPlace();
    if (pl) {
      chips.push({
        id: 'place',
        type: 'place',
        label: `Location: ${pl}`,
        value: pl,
        icon: 'place'
      });
    }

    const q = this.searchInput().trim();
    if (q) {
      chips.push({
        id: 'search',
        type: 'search',
        label: `Filter: ${q}`,
        value: q,
        icon: 'person'
      });
    }

    const jTitle = this.selectedJourneyTitle();
    if (this.selectedJourneyId() && jTitle) {
      chips.push({
        id: 'journey',
        type: 'journey',
        label: `Journey: ${jTitle}`,
        value: this.selectedJourneyId(),
        icon: 'auto_stories'
      });
    }

    this.smartChips.set(chips);
  }

  onSearchSubmit(): void {
    this.updateUrlParams({
      search: this.searchInput().trim() || null
    });
  }

  clearSearch(): void {
    this.searchInput.set('');
    this.updateUrlParams({ search: null });
  }

  clearPlace(): void {
    this.updateUrlParams({ place: null });
  }

  clearPerson(): void {
    this.updateUrlParams({ person: null });
  }

  resetAllFilters(): void {
    this.smartChips.set([]);
    this.smartSearchText.set('');
    this.searchInput.set('');
    this.selectedYear.set(null);
    this.selectedMonth.set(null);
    this.selectedPlace.set(null);
    this.selectedJourneyId.set(null);
    this.selectedSectionId.set(null);
    this.selectedPersonId.set(null);
    this.router.navigate(['/timeline']);
  }


  private updateUrlParams(newParams: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: newParams,
      queryParamsHandling: 'merge'
    });
  }

  // Helpers
  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDayBadge(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  toggleFavorite(memory: Memory, event: Event): void {
    event.stopPropagation();
    const previous = memory.isFavorite;
    memory.isFavorite = !previous;
    this.memories.update(list => [...list]);

    this.memoryService.toggleFavorite(memory.id).subscribe({
      next: (updated) => {
        memory.isFavorite = updated.isFavorite;
        const msg = updated.isFavorite ? 'Saved to favorites' : 'Removed from favorites';
        this.snackBar.open(msg, 'Undo', { duration: 3000 }).onAction().subscribe(() => {
          this.toggleFavorite(memory, event);
        });
      },
      error: () => {
        memory.isFavorite = previous;
        this.memories.update(list => [...list]);
        this.snackBar.open('Unable to update favorite', 'Close', { duration: 3000 });
      }
    });
  }

  openAddToCollection(memory: Memory, event: Event): void {
    event.stopPropagation();
    this.dialog.open(AddToCollectionDialogComponent, {
      data: { memory },
      width: '460px',
      panelClass: 'mv-dialog-panel'
    });
  }

  openLightbox(memory: Memory, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.lightboxService.openForMemory(memory);
  }

  getCoverUrl(memory?: Memory): string {
    if (!memory) return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
    if (memory.coverImageUrl) return optimizeCloudinaryUrl(memory.coverImageUrl, 800);
    if (memory.mediaList && memory.mediaList.length > 0) {
      const media = memory.mediaList[0];
      return optimizeCloudinaryUrl(media.thumbnailUrl || media.mediaUrl, 800);
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
  }
}
