import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { CollectionService } from '@core/services/collection.service';
import { MemoryService } from '@core/services/memory.service';
import { LightboxService } from '@core/services/lightbox.service';
import { Collection } from '@core/models/collection.model';
import { Memory } from '@core/models/memory.model';
import { PagedResponse } from '@core/models/api-response.model';

@Component({
  selector: 'mv-collection-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    ImageFallbackDirective
  ],
  templateUrl: './collection-detail.component.html',
  styleUrl: './collection-detail.component.scss'
})
export class CollectionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly collectionService = inject(CollectionService);
  private readonly memoryService = inject(MemoryService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly lightboxService = inject(LightboxService);

  collectionId!: string;
  readonly collection = signal<Collection | null>(null);
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

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.paramMap.get('id')!;
    this.loadCollectionData();
  }

  loadCollectionData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.collectionService.getCollectionById(this.collectionId).subscribe({
      next: (col) => {
        this.collection.set(col);
        this.fetchMemories(0, false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  fetchMemories(page: number, append: boolean): void {
    if (page === 0) {
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }

    this.collectionService.getCollectionMemories(this.collectionId, page, this.pageSize).subscribe({
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
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  loadMore(): void {
    if (this.isLastPage() || this.isLoadingMore()) return;
    this.fetchMemories(this.currentPage() + 1, true);
  }

  toggleFavorite(memory: Memory, event: Event): void {
    event.stopPropagation();
    const previous = memory.isFavorite;
    memory.isFavorite = !previous;
    this.memories.update(l => [...l]);

    this.memoryService.toggleFavorite(memory.id).subscribe({
      next: (updated) => {
        memory.isFavorite = updated.isFavorite;
        this.snackBar.open(updated.isFavorite ? 'Saved to favorites' : 'Removed from favorites', 'Close', { duration: 2500 });
      },
      error: () => {
        memory.isFavorite = previous;
        this.memories.update(l => [...l]);
      }
    });
  }

  removeMemoryFromCollection(memory: Memory, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Remove "${memory.title}" from this collection?`)) return;

    this.collectionService.removeMemoryFromCollection(this.collectionId, memory.id).subscribe({
      next: () => {
        this.memories.update(list => list.filter(m => m.id !== memory.id));
        this.totalElements.update(n => Math.max(0, n - 1));
        this.collection.update(c => c ? { ...c, memoryCount: Math.max(0, c.memoryCount - 1) } : null);
        this.snackBar.open('Removed moment from collection', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Unable to remove moment', 'Close', { duration: 3000 });
      }
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
