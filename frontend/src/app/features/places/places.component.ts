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
  private readonly router = inject(Router);

  readonly locations = signal<PlaceSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  searchQuery: string = '';

  readonly filteredLocations = computed<PlaceSummary[]>(() => {
    const q = this.searchQuery.trim().toLowerCase();
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

  exploreLocation(locationName: string): void {
    this.router.navigate(['/timeline'], { 
      queryParams: { place: locationName } 
    });
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
    return loc.coverImageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }
}
