import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GalleryItem, GalleryFilterParams } from '@core/models/gallery.model';
import { MediaType } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { GalleryService } from '@core/services/gallery.service';
import { JourneyService } from '@core/services/journey.service';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';

@Component({
  selector: 'mv-gallery-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './gallery-grid.component.html',
  styleUrl: './gallery-grid.component.scss'
})
export class GalleryGridComponent implements OnInit {
  private readonly galleryService = inject(GalleryService);
  private readonly journeyService = inject(JourneyService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<GalleryItem[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly selectedType = signal<MediaType | null>(null);
  readonly totalItems = signal<number>(0);

  selectedJourneyId: string = '';
  sortDirection: 'ASC' | 'DESC' = 'DESC';

  ngOnInit(): void {
    this.loadJourneys();
    this.loadGallery();
  }

  loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (data) => this.journeys.set(data),
      error: (err) => console.error('Failed to load journeys for gallery:', err)
    });
  }

  loadGallery(): void {
    this.isLoading.set(true);

    const params: GalleryFilterParams = {
      mediaType: this.selectedType() || undefined,
      journeyId: this.selectedJourneyId || undefined,
      sortBy: 'memoryDate',
      sortDirection: this.sortDirection,
      page: 0,
      size: 100
    };

    this.galleryService.getGallery(params).subscribe({
      next: (response) => {
        this.items.set(response.content || []);
        this.totalItems.set(response.totalElements || (response.content ? response.content.length : 0));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load gallery:', err);
        this.isLoading.set(false);
      }
    });
  }

  setTypeFilter(type: MediaType | null): void {
    this.selectedType.set(type);
    this.loadGallery();
  }

  onSortChange(): void {
    this.loadGallery();
  }

  resetFilters(): void {
    this.selectedType.set(null);
    this.selectedJourneyId = '';
    this.sortDirection = 'DESC';
    this.loadGallery();
  }

  openLightbox(startIndex: number): void {
    this.dialog.open(MediaViewerModalComponent, {
      data: {
        items: this.items(),
        startIndex
      } as MediaViewerData,
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
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
}
