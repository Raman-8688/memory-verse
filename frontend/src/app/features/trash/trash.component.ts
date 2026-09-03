import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { TrashService } from '@core/services/trash.service';
import { TrashItem } from '@core/models/trash.model';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { NotificationStateService } from '@core/services/notification-state.service';

@Component({
  selector: 'mv-trash',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ImageFallbackDirective
  ],
  templateUrl: './trash.component.html',
  styleUrl: './trash.component.scss'
})
export class TrashComponent implements OnInit {
  private readonly trashService = inject(TrashService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly notificationState = inject(NotificationStateService);

  readonly items = signal<TrashItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly actionInProgressId = signal<string | null>(null);
  readonly isClearingAll = signal<boolean>(false);

  ngOnInit(): void {
    this.loadTrash();
  }

  loadTrash(): void {
    this.isLoading.set(true);
    this.trashService.getTrashItems().subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load trash items', 'Close', { duration: 3000 });
      }
    });
  }

  restore(item: TrashItem): void {
    this.actionInProgressId.set(item.id);
    const obs = item.type === 'MEMORY' 
      ? this.trashService.restoreMemory(item.id) 
      : this.trashService.restoreJourney(item.id);

    obs.subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.actionInProgressId.set(null);
        this.notificationState.refresh();
        this.snackBar.open(`${item.type === 'MEMORY' ? 'Memory' : 'Journey'} restored successfully!`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.actionInProgressId.set(null);
        this.snackBar.open('Failed to restore item', 'Close', { duration: 3000 });
      }
    });
  }

  hardDelete(item: TrashItem): void {
    if (!confirm(`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    this.actionInProgressId.set(item.id);
    const obs = item.type === 'MEMORY'
      ? this.trashService.hardDeleteMemory(item.id)
      : this.trashService.hardDeleteJourney(item.id);

    obs.subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.actionInProgressId.set(null);
        this.snackBar.open('Permanently deleted', 'Close', { duration: 3000 });
      },
      error: () => {
        this.actionInProgressId.set(null);
        this.snackBar.open('Failed to delete item', 'Close', { duration: 3000 });
      }
    });
  }

  emptyAllTrash(): void {
    if (!confirm('Are you sure you want to empty the entire trash bin? All soft-deleted items will be permanently erased.')) {
      return;
    }

    this.isClearingAll.set(true);
    this.trashService.emptyTrash().subscribe({
      next: () => {
        this.items.set([]);
        this.isClearingAll.set(false);
        this.snackBar.open('Trash bin emptied', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isClearingAll.set(false);
        this.snackBar.open('Failed to empty trash', 'Close', { duration: 3000 });
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Deleted today';
    if (diffDays === 1) return 'Deleted yesterday';
    return `Deleted ${diffDays} days ago`;
  }
}
