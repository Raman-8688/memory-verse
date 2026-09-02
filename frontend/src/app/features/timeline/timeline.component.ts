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
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { Memory, MemoryFilterParams } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { PagedResponse } from '@core/models/api-response.model';
import { AddToCollectionDialogComponent } from '@shared/components/add-to-collection-dialog/add-to-collection-dialog.component';

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
    ImageFallbackDirective
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
  readonly selectedPlace = signal<string | null>(null);
  readonly selectedPersonId = signal<string | null>(null);
  readonly searchInput = signal<string>('');

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
      const journeyParam = params['journey'] || null;
      const placeParam = params['place'] || null;
      const personParam = params['person'] || params['userId'] || null;
      const searchParam = params['search'] || '';

      this.selectedYear.set(yearParam);
      this.selectedMonth.set(monthParam);
      this.selectedJourneyId.set(journeyParam);
      this.selectedPlace.set(placeParam);
      this.selectedPersonId.set(personParam);
      this.searchInput.set(searchParam);

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

  getCoverUrl(memory?: Memory): string {
    if (!memory) return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
    if (memory.mediaList && memory.mediaList.length > 0) {
      const media = memory.mediaList[0];
      return media.thumbnailUrl || media.mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
  }
}
