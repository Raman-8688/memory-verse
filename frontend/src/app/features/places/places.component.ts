import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { PlaceService } from '@core/services/place.service';
import { PlaceSummary } from '@core/models/place.model';
import { AiSearchService } from '@core/services/ai-search.service';
import { optimizeCloudinaryUrl } from '@shared/pipes/cloudinary-optimize.pipe';

export interface PlaceFilterChip {
  id: string;
  type: 'place' | 'year' | 'person' | 'keyword';
  label: string;
  value: any;
  icon: string;
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
  private readonly placeService = inject(PlaceService);
  private readonly aiSearchService = inject(AiSearchService);
  private readonly router = inject(Router);

  readonly locations = signal<PlaceSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly isExtractingIntent = signal<boolean>(false);
  readonly activeChips = signal<PlaceFilterChip[]>([]);
  searchQuery: string = '';

  readonly filteredLocations = computed<PlaceSummary[]>(() => {
    const chips = this.activeChips();
    const placeChip = chips.find(c => c.type === 'place');
    const keywordChip = chips.find(c => c.type === 'keyword');
    const q = (placeChip ? placeChip.value : (keywordChip ? keywordChip.value : this.searchQuery)).trim().toLowerCase();
    const list = this.locations();
    if (!q) return list;
    return list.filter(loc => loc.locationName.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadPlaces();
  }

  loadPlaces(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.placeService.getPlaces().subscribe({
      next: (places) => {
        this.locations.set(places || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load places summary:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  onSmartSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (!q || this.isExtractingIntent()) return;

    this.isExtractingIntent.set(true);

    this.aiSearchService.getSearchSummary(q).subscribe({
      next: (summary) => {
        this.isExtractingIntent.set(false);
        const filters = summary.activeFilters;
        const chips: PlaceFilterChip[] = [];

        if (filters.location) {
          chips.push({
            id: 'place',
            type: 'place',
            label: `Location: ${filters.location}`,
            value: filters.location,
            icon: 'place'
          });
        }

        if (filters.dateStart) {
          const y = parseInt(filters.dateStart.split('-')[0], 10);
          if (!isNaN(y)) {
            chips.push({
              id: 'year',
              type: 'year',
              label: `Year: ${y}`,
              value: y,
              icon: 'calendar_today'
            });
          }
        }

        if (filters.personName) {
          chips.push({
            id: 'person',
            type: 'person',
            label: `Person: ${filters.personName}`,
            value: filters.personName,
            icon: 'person'
          });
        }

        if (chips.length === 0) {
          chips.push({
            id: 'keyword',
            type: 'keyword',
            label: `Destination: ${q}`,
            value: q,
            icon: 'search'
          });
        }

        this.activeChips.set(chips);
        this.searchQuery = '';
      },
      error: (err) => {
        this.isExtractingIntent.set(false);
        console.warn('Place search extraction error, applying literal filter:', err);
        this.activeChips.set([{
          id: 'keyword',
          type: 'keyword',
          label: `Search: ${q}`,
          value: q,
          icon: 'search'
        }]);
        this.searchQuery = '';
      }
    });
  }

  removeChip(chip: PlaceFilterChip): void {
    this.activeChips.update(chips => chips.filter(c => c.id !== chip.id));
  }

  clearAllChips(): void {
    this.activeChips.set([]);
    this.searchQuery = '';
  }

  exploreLocation(locationName: string): void {
    const queryParams: Record<string, any> = { place: locationName };
    const yearChip = this.activeChips().find(c => c.type === 'year');
    if (yearChip) {
      queryParams['year'] = yearChip.value;
    }
    const personChip = this.activeChips().find(c => c.type === 'person');
    if (personChip) {
      queryParams['search'] = personChip.value;
    }

    this.router.navigate(['/timeline'], { queryParams });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getHeroCover(loc: PlaceSummary): string {
    return optimizeCloudinaryUrl(loc.coverImageUrl, 800) || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }
}
