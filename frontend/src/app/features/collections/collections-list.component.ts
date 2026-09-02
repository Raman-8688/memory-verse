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
import { MediaService } from '@core/services/media.service';
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
  private readonly mediaService = inject(MediaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly collections = signal<Collection[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  // Creation modal state
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly selectedCoverFile = signal<File | null>(null);
  readonly selectedCoverFileName = signal<string>('');
  readonly coverPreviewUrl = signal<string | null>(null);
  readonly showUrlInput = signal<boolean>(false);

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
    this.selectedCoverFile.set(null);
    this.selectedCoverFileName.set('');
    this.coverPreviewUrl.set(null);
    this.showUrlInput.set(false);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.selectedCoverFile.set(null);
    this.selectedCoverFileName.set('');
    this.coverPreviewUrl.set(null);
    this.showUrlInput.set(false);
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedCoverFile.set(file);
    this.selectedCoverFileName.set(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    this.coverPreviewUrl.set(URL.createObjectURL(file));
    input.value = '';
  }

  removeCoverFile(): void {
    this.selectedCoverFile.set(null);
    this.selectedCoverFileName.set('');
    this.coverPreviewUrl.set(null);
  }

  toggleUrlInput(): void {
    this.showUrlInput.update(v => !v);
  }

  submitCreateCollection(): void {
    const title = this.newTitle.trim();
    if (!title) return;

    this.isSubmitting.set(true);

    const file = this.selectedCoverFile();
    if (file) {
      // Step 1: Upload cover photo from device
      this.isUploadingCover.set(true);
      this.mediaService.uploadSingleFile(file).subscribe({
        next: (uploaded) => {
          this.isUploadingCover.set(false);
          this.executeCreateCollection(title, uploaded.mediaUrl);
        },
        error: (err) => {
          this.isUploadingCover.set(false);
          this.isSubmitting.set(false);
          console.error('Failed to upload collection cover photo:', err);
          this.snackBar.open('Unable to upload cover photo. Please try again.', 'Close', { duration: 3500 });
        }
      });
    } else {
      const coverUrl = this.newCoverUrl.trim() || undefined;
      this.executeCreateCollection(title, coverUrl);
    }
  }

  private executeCreateCollection(title: string, coverImageUrl?: string): void {
    this.collectionService.createCollection({
      title,
      description: this.newDescription.trim() || undefined,
      coverImageUrl
    }).subscribe({
      next: (created) => {
        this.collections.update(curr => [created, ...curr]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
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
