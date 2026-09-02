import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { JourneyService } from '@core/services/journey.service';
import { MemoryService } from '@core/services/memory.service';
import { LightboxService } from '@core/services/lightbox.service';
import { Journey } from '@core/models/journey.model';
import { Memory, Media } from '@core/models/memory.model';

@Component({
  selector: 'mv-journey-storybook',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ImageFallbackDirective,
    AudioPlayerComponent
  ],
  templateUrl: './journey-storybook.component.html',
  styleUrl: './journey-storybook.component.scss'
})
export class JourneyStorybookComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journeyService = inject(JourneyService);
  private readonly memoryService = inject(MemoryService);
  private readonly lightboxService = inject(LightboxService);

  journeyId!: string;
  readonly journey = signal<Journey | null>(null);
  readonly memories = signal<Memory[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  // 0 = Cover / Prologue, 1..N = Memories, N+1 = Epilogue
  readonly currentPage = signal<number>(0);
  readonly activeMediaIndex = signal<number>(0);
  readonly isFullscreen = signal<boolean>(false);

  // Total pages = 1 (Prologue) + memories.length + 1 (Epilogue)
  readonly totalPages = computed(() => {
    const mems = this.memories();
    return mems.length > 0 ? mems.length + 2 : 1;
  });

  readonly currentMemory = computed<Memory | null>(() => {
    const page = this.currentPage();
    const mems = this.memories();
    if (page >= 1 && page <= mems.length) {
      return mems[page - 1];
    }
    return null;
  });

  readonly currentMedia = computed<Media | null>(() => {
    const mem = this.currentMemory();
    if (!mem || !mem.mediaList || mem.mediaList.length === 0) return null;
    const idx = this.activeMediaIndex();
    return mem.mediaList[idx] || mem.mediaList[0];
  });

  readonly progressPercentage = computed<number>(() => {
    const total = this.totalPages();
    if (total <= 1) return 100;
    return Math.round((this.currentPage() / (total - 1)) * 100);
  });

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id')!;
    this.loadStorybook();
  }

  ngOnDestroy(): void {
    // Ensure body scroll is unlocked when leaving storybook
    document.body.style.overflow = '';
  }

  loadStorybook(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    document.body.style.overflow = 'hidden';

    this.journeyService.getJourneyById(this.journeyId).subscribe({
      next: (j) => {
        this.journey.set(j);
        this.fetchJourneyMemories();
      },
      error: (err) => {
        console.error('Failed to load journey for storybook:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  private fetchJourneyMemories(): void {
    this.memoryService.getMemories({
      journeyId: this.journeyId,
      size: 150,
      sortBy: 'memoryDate',
      sortDirection: 'ASC'
    }).subscribe({
      next: (res) => {
        const list = res.content || [];
        this.memories.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load memories for storybook:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  // Keyboard navigation: ArrowRight, ArrowLeft, ArrowDown, ArrowUp, Space, Escape
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.isLoading() || this.hasError()) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.prevPage();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.exitStorybook();
    } else if (event.key.toLowerCase() === 'f') {
      this.toggleBrowserFullscreen();
    }
  }

  // Wheel listener for smooth flip with debounce
  private lastWheelTime = 0;
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    const now = Date.now();
    if (now - this.lastWheelTime < 450) return; // debounce
    if (Math.abs(event.deltaY) > 25) {
      this.lastWheelTime = now;
      if (event.deltaY > 0) {
        this.nextPage();
      } else {
        this.prevPage();
      }
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
      this.activeMediaIndex.set(0);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.activeMediaIndex.set(0);
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.activeMediaIndex.set(0);
    }
  }

  selectMedia(index: number): void {
    this.activeMediaIndex.set(index);
  }

  openLightboxForCurrent(): void {
    const mem = this.currentMemory();
    if (mem) {
      this.lightboxService.openForMemory(mem, this.activeMediaIndex());
    }
  }

  toggleBrowserFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen.set(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.isFullscreen.set(false);
    }
  }

  exitStorybook(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.router.navigate(['/journeys', this.journeyId]);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDateRange(start?: string, end?: string): string {
    if (!start) return '';
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!end) return s;
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${s} — ${e}`;
  }

  getAudioMedia(mem: Memory | null): Media[] {
    if (!mem || !mem.mediaList) return [];
    return mem.mediaList.filter(m => m.mediaType === 'AUDIO');
  }

  getHeroImage(j: Journey): string {
    return j.coverImageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80';
  }
}
