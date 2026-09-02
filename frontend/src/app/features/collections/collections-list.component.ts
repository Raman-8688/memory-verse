import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { CollectionService } from '@core/services/collection.service';
import { Collection } from '@core/models/collection.model';

@Component({
  selector: 'mv-collections-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    ImageFallbackDirective
  ],
  templateUrl: './collections-list.component.html',
  styleUrl: './collections-list.component.scss'
})
export class CollectionsListComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly snackBar = inject(MatSnackBar);

  readonly collections = signal<Collection[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  // Creation modal state
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  newTitle = '';
  newDescription = '';
  newCoverUrl = '';

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.collectionService.getCollections().subscribe({
      next: (list) => {
        this.collections.set(list || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newCoverUrl = '';
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreateCollection(): void {
    const title = this.newTitle.trim();
    if (!title) return;

    this.isSubmitting.set(true);
    this.collectionService.createCollection({
      title,
      description: this.newDescription.trim() || undefined,
      coverImageUrl: this.newCoverUrl.trim() || undefined
    }).subscribe({
      next: (created) => {
        this.collections.update(curr => [created, ...curr]);
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
        this.snackBar.open(`Created collection "${created.title}"`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Unable to create collection', 'Close', { duration: 3000 });
      }
    });
  }

  deleteCollection(collection: Collection, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete the collection "${collection.title}"? Memories will not be deleted.`)) {
      return;
    }

    this.collectionService.deleteCollection(collection.id).subscribe({
      next: () => {
        this.collections.update(curr => curr.filter(c => c.id !== collection.id));
        this.snackBar.open(`Deleted collection "${collection.title}"`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Unable to delete collection', 'Close', { duration: 3000 });
      }
    });
  }

  getHeroImage(collection: Collection): string {
    return collection.coverImageUrl || 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80';
  }
}
