import { 
  Component, 
  OnInit, 
  OnDestroy, 
  HostListener, 
  ViewChild, 
  ElementRef, 
  inject, 
  signal, 
  computed, 
  effect 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommandPaletteService } from '@core/services/command-palette.service';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { Memory } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';

export type ResultType = 'memory' | 'journey' | 'place' | 'person';

export interface PaletteItem {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  extraBadge?: string;
  routeUrl?: string;
  queryParams?: Record<string, string>;
  flatIndex: number;
}

export interface CategorizedResults {
  memories: PaletteItem[];
  journeys: PaletteItem[];
  places: PaletteItem[];
  people: PaletteItem[];
}

@Component({
  selector: 'mv-command-palette',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss'
})
export class CommandPaletteComponent implements OnInit {
  readonly paletteService = inject(CommandPaletteService);
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  searchQuery: string = '';
  readonly isLoading = signal<boolean>(false);
  readonly selectedIndex = signal<number>(0);

  // Raw cached datasets
  private readonly rawMemories = signal<Memory[]>([]);
  private readonly rawJourneys = signal<Journey[]>([]);

  constructor() {
    // Focus search input whenever palette opens
    effect(() => {
      if (this.paletteService.isOpen()) {
        this.selectedIndex.set(0);
        setTimeout(() => {
          this.searchInputRef?.nativeElement.focus();
        }, 80);
      }
    });
  }

  ngOnInit(): void {
    this.preloadData();
  }

  private preloadData(): void {
    this.memoryService.getMemories({ size: 100 }).subscribe({
      next: (res) => this.rawMemories.set(res.content || []),
      error: (err) => console.error('CommandPalette failed to preload memories:', err)
    });

    this.journeyService.getJourneys().subscribe({
      next: (list) => this.rawJourneys.set(list || []),
      error: (err) => console.error('CommandPalette failed to preload journeys:', err)
    });
  }

  // Multi-Index Filtered Results
  readonly categorizedResults = computed<CategorizedResults>(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return { memories: [], journeys: [], places: [], people: [] };
    }

    let flatIdx = 0;

    // 1. Memories
    const memResults: PaletteItem[] = this.rawMemories()
      .filter(m => m.title.toLowerCase().includes(q) || (m.story && m.story.toLowerCase().includes(q)))
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        type: 'memory' as ResultType,
        title: m.title,
        subtitle: m.story ? m.story.slice(0, 70) + '...' : (m.locationName || 'Memory moment'),
        extraBadge: m.journeyTitle || 'Story',
        routeUrl: `/memories/${m.id}`,
        flatIndex: flatIdx++
      }));

    // 2. Journeys
    const journeyResults: PaletteItem[] = this.rawJourneys()
      .filter(j => j.title.toLowerCase().includes(q) || (j.description && j.description.toLowerCase().includes(q)))
      .slice(0, 4)
      .map(j => ({
        id: j.id,
        type: 'journey' as ResultType,
        title: j.title,
        subtitle: j.description ? j.description.slice(0, 70) + '...' : 'Journey Chapter',
        routeUrl: `/journeys/${j.id}`,
        flatIndex: flatIdx++
      }));

    // 3. Places (Derived from memory locationName)
    const placeMap = new Map<string, number>();
    this.rawMemories().forEach(m => {
      const loc = m.locationName?.trim();
      if (loc && loc.toLowerCase().includes(q)) {
        placeMap.set(loc, (placeMap.get(loc) || 0) + 1);
      }
    });

    const placeResults: PaletteItem[] = Array.from(placeMap.entries())
      .slice(0, 4)
      .map(([locName, count]) => ({
        id: `place-${locName}`,
        type: 'place' as ResultType,
        title: locName,
        subtitle: `${count} ${count === 1 ? 'memory' : 'memories'} captured here`,
        routeUrl: '/memories',
        queryParams: { keyword: locName },
        flatIndex: flatIdx++
      }));

    // 4. People (Authors & Tagged friends)
    const personMap = new Map<string, { id: string; name: string; count: number }>();
    this.rawMemories().forEach(m => {
      if (m.createdBy?.fullName && m.createdBy.fullName.toLowerCase().includes(q)) {
        const p = personMap.get(m.createdBy.id) || { id: m.createdBy.id, name: m.createdBy.fullName, count: 0 };
        p.count++;
        personMap.set(m.createdBy.id, p);
      }
      if (m.taggedUsers) {
        m.taggedUsers.forEach(tu => {
          if (tu.fullName && tu.fullName.toLowerCase().includes(q)) {
            const p = personMap.get(tu.id) || { id: tu.id, name: tu.fullName, count: 0 };
            p.count++;
            personMap.set(tu.id, p);
          }
        });
      }
    });

    const peopleResults: PaletteItem[] = Array.from(personMap.values())
      .slice(0, 4)
      .map(p => ({
        id: `person-${p.id}`,
        type: 'person' as ResultType,
        title: p.name,
        subtitle: `${p.count} shared ${p.count === 1 ? 'memory' : 'memories'} in the circle`,
        routeUrl: '/memories',
        queryParams: { keyword: p.name },
        flatIndex: flatIdx++
      }));

    return {
      memories: memResults,
      journeys: journeyResults,
      places: placeResults,
      people: peopleResults
    };
  });

  readonly flattenedResults = computed<PaletteItem[]>(() => {
    const cats = this.categorizedResults();
    return [
      ...cats.memories,
      ...cats.journeys,
      ...cats.places,
      ...cats.people
    ];
  });

  // Global Keyboard Listener
  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    // Cmd+K (Mac) or Ctrl+K (Windows)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteService.toggle();
      return;
    }

    // Escape closes
    if (event.key === 'Escape' && this.paletteService.isOpen()) {
      event.preventDefault();
      this.close();
      return;
    }

    // When palette is open, handle ArrowUp, ArrowDown, and Enter
    if (this.paletteService.isOpen()) {
      const items = this.flattenedResults();
      if (items.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex.update(idx => (idx + 1) % items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex.update(idx => (idx - 1 + items.length) % items.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const activeItem = items[this.selectedIndex()];
        if (activeItem) {
          this.navigateTo(activeItem);
        }
      }
    }
  }

  onQueryChange(): void {
    this.selectedIndex.set(0);
  }

  clearQuery(): void {
    this.searchQuery = '';
    this.selectedIndex.set(0);
    this.searchInputRef?.nativeElement.focus();
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex.set(index);
  }

  navigateTo(item: PaletteItem): void {
    this.close();
    if (item.queryParams) {
      this.router.navigate([item.routeUrl], { queryParams: item.queryParams });
    } else if (item.routeUrl) {
      this.router.navigate([item.routeUrl]);
    }
  }

  quickNavigate(route: string): void {
    this.close();
    this.router.navigate([route]);
  }

  onBackdropClick(event: MouseEvent): void {
    this.close();
  }

  close(): void {
    this.searchQuery = '';
    this.paletteService.close();
  }
}
