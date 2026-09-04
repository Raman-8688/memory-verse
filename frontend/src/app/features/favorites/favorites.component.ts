import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MemoryService } from '@core/services/memory.service';
import { Memory, MemoryFilterParams } from '@core/models/memory.model';
import { PagedResponse } from '@core/models/api-response.model';
import { AddToCollectionDialogComponent } from '@shared/components/add-to-collection-dialog/add-to-collection-dialog.component';
import { LightboxService } from '@core/services/lightbox.service';

@Component({
  selector: 'mv-favorites',
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
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss'
})
export class FavoritesComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly lightboxService = inject(LightboxService);

  readonly memories = signal<Memory[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);

  // Pagination
  readonly currentPage = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);
  readonly isLastPage = signal<boolean>(true);
  readonly pageSize = 12;

  // Search
  readonly searchInput = signal<string>('');

  ngOnInit(): void {
    this.fetchFavorites(0, false);
  }

  fetchFavorites(page: number, append: boolean): void {
    if (page === 0) {
      this.isLoading.set(true);
      this.hasError.set(false);
    } else {
      this.isLoadingMore.set(true);
    }

    const params: MemoryFilterParams = {
      isFavorite: true,
      page,
      size: this.pageSize,
      sortBy: 'memoryDate',
      sortDirection: 'DESC'
    };

    const term = this.searchInput().trim();
    if (term) {
      params.search = term;
    }

    this.memoryService.getMemories(params).subscribe({
      next: (res: PagedResponse<Memory>) => {
        if (append) {
          this.memories.update(curr => [...curr, ...(res.content || [])]);
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
    this.fetchFavorites(this.currentPage() + 1, true);
  }

  onSearchSubmit(): void {
    this.fetchFavorites(0, false);
  }

  clearSearch(): void {
    this.searchInput.set('');
    this.fetchFavorites(0, false);
  }

  // Optimistic Favorite Toggle
  toggleFavorite(memory: Memory, event: Event): void {
    event.stopPropagation();
    const previousState = memory.isFavorite;
    const newState = !previousState;

    // Optimistic local update
    memory.isFavorite = newState;
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
        // Rollback on failure
        memory.isFavorite = previousState;
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
      const m = memory.mediaList[0];
      return m.thumbnailUrl || m.mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
  }
}
