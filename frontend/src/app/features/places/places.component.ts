import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MemoryService } from '@core/services/memory.service';
import { Memory } from '@core/models/memory.model';

export interface LocationGroup {
  name: string;
  memoryCount: number;
  totalMedia: number;
  heroImageUrl: string;
  latestMemoryTitle: string;
  latestDate: string;
}

@Component({
  selector: 'mv-places',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './places.component.html',
  styleUrl: './places.component.scss'
})
export class PlacesComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly router = inject(Router);

  readonly locations = signal<LocationGroup[]>([]);
  readonly isLoading = signal<boolean>(true);
  searchQuery: string = '';

  readonly filteredLocations = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.locations();
    if (!q) return list;
    return list.filter(loc => loc.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadPlaces();
  }

  loadPlaces(): void {
    this.isLoading.set(true);
    this.memoryService.getMemories({ size: 100 }).subscribe({
      next: (res) => {
        const memories = res.content || [];
        const map = new Map<string, { memories: Memory[]; totalMedia: number }>();

        memories.forEach(m => {
          const locName = m.locationName?.trim();
          if (locName) {
            if (!map.has(locName)) {
              map.set(locName, { memories: [], totalMedia: 0 });
            }
            const group = map.get(locName)!;
            group.memories.push(m);
            group.totalMedia += (m.mediaList?.length || 0);
          }
        });

        const locationList: LocationGroup[] = Array.from(map.entries()).map(([name, data]) => {
          // Sort memories by memoryDate descending
          data.memories.sort((a, b) => new Date(b.memoryDate || b.createdAt).getTime() - new Date(a.memoryDate || a.createdAt).getTime());
          const latest = data.memories[0];
          
          let heroUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
          for (const mem of data.memories) {
            if (mem.mediaList && mem.mediaList.length > 0) {
              const med = mem.mediaList[0];
              heroUrl = med.thumbnailUrl || med.mediaUrl;
              break;
            }
          }

          return {
            name,
            memoryCount: data.memories.length,
            totalMedia: data.totalMedia,
            heroImageUrl: heroUrl,
            latestMemoryTitle: latest.title,
            latestDate: latest.memoryDate || latest.createdAt
          };
        });

        // Sort locations by memory count descending
        locationList.sort((a, b) => b.memoryCount - a.memoryCount);
        this.locations.set(locationList);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load places:', err);
        this.isLoading.set(false);
      }
    });
  }

  exploreLocation(locationName: string): void {
    this.router.navigate(['/memories'], { queryParams: { keyword: locationName } });
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
