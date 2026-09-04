import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Memory, Media } from '@core/models/memory.model';
import { MemoryService } from '@core/services/memory.service';
import { LightboxService } from '@core/services/lightbox.service';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';

export interface YearAnniversaryGroup {
  year: number;
  yearsAgo: number;
  yearsAgoLabel: string;
  memories: Memory[];
}

@Component({
  selector: 'mv-on-this-day',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './on-this-day.component.html',
  styleUrl: './on-this-day.component.scss'
})
export class OnThisDayComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly lightbox = inject(LightboxService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal<boolean>(true);
  readonly allMemories = signal<Memory[]>([]);

  readonly today = new Date();
  readonly todayFormatted = computed(() => {
    return this.today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  });

  readonly exactAnniversaryGroups = computed<YearAnniversaryGroup[]>(() => {
    const todayMonth = this.today.getMonth();
    const todayDate = this.today.getDate();
    const currentYear = this.today.getFullYear();

    const matches = this.allMemories().filter(m => {
      if (!m.memoryDate) return false;
      const d = new Date(m.memoryDate);
      return d.getMonth() === todayMonth && d.getDate() === todayDate;
    });

    // Group by year
    const groupsMap = new Map<number, Memory[]>();
    for (const mem of matches) {
      const year = new Date(mem.memoryDate).getFullYear();
      if (!groupsMap.has(year)) {
        groupsMap.set(year, []);
      }
      groupsMap.get(year)!.push(mem);
    }

    const sortedYears = Array.from(groupsMap.keys()).sort((a, b) => b - a);

    return sortedYears.map(year => {
      const diff = currentYear - year;
      let label = 'This Year';
      if (diff === 1) label = '1 Year Ago';
      else if (diff > 1) label = `${diff} Years Ago`;

      return {
        year,
        yearsAgo: diff,
        yearsAgoLabel: label,
        memories: groupsMap.get(year)!
      };
    });
  });

  readonly thisMonthMemories = computed<Memory[]>(() => {
    const todayMonth = this.today.getMonth();
    const todayDate = this.today.getDate();

    return this.allMemories().filter(m => {
      if (!m.memoryDate) return false;
      const d = new Date(m.memoryDate);
      return d.getMonth() === todayMonth && d.getDate() !== todayDate;
    }).slice(0, 12);
  });

  ngOnInit(): void {
    this.loadAnniversaryMemories();
  }

  loadAnniversaryMemories(): void {
    this.isLoading.set(true);
    const month = this.today.getMonth() + 1; // 1-indexed

    this.memoryService.getMemories({ month, size: 100 }).subscribe({
      next: (res) => {
        this.allMemories.set(res.content || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load anniversary memories', err);
        this.isLoading.set(false);
      }
    });
  }

  openLightbox(memory: Memory, index: number = 0): void {
    this.lightbox.openForMemory(memory, index);
  }

  toggleFavorite(mem: Memory, event: Event): void {
    event.stopPropagation();
    const prev = mem.isFavorite;
    mem.isFavorite = !prev;

    this.memoryService.toggleFavorite(mem.id).subscribe({
      next: (updated) => {
        mem.isFavorite = updated.isFavorite;
        this.snackBar.open(updated.isFavorite ? 'Saved to favorites' : 'Removed from favorites', 'Close', { duration: 2500 });
      },
      error: () => {
        mem.isFavorite = prev;
        this.snackBar.open('Failed to update favorite', 'Close', { duration: 3000 });
      }
    });
  }

  getHeroImage(mem: Memory): string {
    if (mem.mediaList && mem.mediaList.length > 0) {
      const first = mem.mediaList[0];
      return first.thumbnailUrl || first.mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
