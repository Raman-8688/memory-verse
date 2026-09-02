import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionService } from '@core/services/collection.service';
import { Collection } from '@core/models/collection.model';
import { Memory } from '@core/models/memory.model';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';

export interface AddToCollectionData {
  memory: Memory;
}

@Component({
  selector: 'mv-add-to-collection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './add-to-collection-dialog.component.html',
  styleUrl: './add-to-collection-dialog.component.scss'
})
export class AddToCollectionDialogComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly dialogRef = inject(MatDialogRef<AddToCollectionDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  readonly data: AddToCollectionData = inject(MAT_DIALOG_DATA);

  readonly collections = signal<Collection[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isCreating = signal<boolean>(false);
  readonly addingToId = signal<string | null>(null);

  // New collection form state
  readonly showNewForm = signal<boolean>(false);
  newTitle = '';
  newDescription = '';

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.isLoading.set(true);
    this.collectionService.getCollections().subscribe({
      next: (list) => {
        this.collections.set(list || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  addToCollection(collection: Collection): void {
    this.addingToId.set(collection.id);
    this.collectionService.addMemoryToCollection(collection.id, this.data.memory.id).subscribe({
      next: () => {
        this.snackBar.open(`Added to "${collection.title}"`, 'Close', { duration: 3000 });
        this.dialogRef.close({ success: true, collectionId: collection.id });
      },
      error: () => {
        this.addingToId.set(null);
        this.snackBar.open('Unable to add memory to collection', 'Close', { duration: 3000 });
      }
    });
  }

  createAndAdd(): void {
    const title = this.newTitle.trim();
    if (!title) return;

    this.isCreating.set(true);
    this.collectionService.createCollection({
      title,
      description: this.newDescription.trim() || undefined,
      initialMemoryIds: [this.data.memory.id]
    }).subscribe({
      next: (created) => {
        this.snackBar.open(`Created collection "${created.title}" and added moment`, 'Close', { duration: 3500 });
        this.dialogRef.close({ success: true, collectionId: created.id });
      },
      error: () => {
        this.isCreating.set(false);
        this.snackBar.open('Unable to create collection', 'Close', { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
