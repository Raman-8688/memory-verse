import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Moment } from '@core/models/moment.model';
import { User } from '@core/models/user.model';
import { MomentService } from '@core/services/moment.service';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/auth.service';
import { LightboxService } from '@core/services/lightbox.service';
import { GalleryItem } from '@core/models/gallery.model';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MomentComposerSheetComponent } from './moment-composer-sheet.component';

@Component({
  selector: 'mv-moments-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatBottomSheetModule,
    MatDialogModule,
    TimeAgoPipe,
    ResolveMediaUrlPipe,
    ImageFallbackDirective
  ],
  templateUrl: './moments-page.component.html',
  styleUrl: './moments-page.component.scss'
})
export class MomentsPageComponent implements OnInit, OnDestroy {
  private readonly momentService = inject(MomentService);
  private readonly userService = inject(UserService);
  readonly authService = inject(AuthService);
  private readonly lightbox = inject(LightboxService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

  readonly moments = signal<Moment[]>([]);
  readonly users = signal<User[]>([]);
  readonly selectedAuthorId = signal<string | null>(null);

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly currentPage = signal<number>(0);
  readonly hasMore = signal<boolean>(false);
  readonly totalElements = signal<number>(0);

  // Inline editing state for captions
  readonly editingMomentId = signal<string | null>(null);
  editingCaptionText = '';
  readonly isSavingCaption = signal<boolean>(false);

  private subCreated?: Subscription;
  private subDeleted?: Subscription;

  ngOnInit(): void {
    this.loadUsers();
    this.loadMoments(0, true);

    this.subCreated = this.momentService.momentCreated$.subscribe(newMoment => {
      const authorFilter = this.selectedAuthorId();
      if (!authorFilter || authorFilter === newMoment.author.id) {
        this.moments.update(list => {
          if (list.some(m => m.id === newMoment.id)) return list;
          return [newMoment, ...list];
        });
        this.totalElements.update(t => t + 1);
      }
    });

    this.subDeleted = this.momentService.momentDeleted$.subscribe(deletedId => {
      this.moments.update(list => list.filter(m => m.id !== deletedId));
      this.totalElements.update(t => Math.max(0, t - 1));
    });
  }

  ngOnDestroy(): void {
    this.subCreated?.unsubscribe();
    this.subDeleted?.unsubscribe();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: userList => this.users.set(userList || []),
      error: err => console.warn('Could not load user filters', err)
    });
  }

  loadMoments(page: number = 0, reset: boolean = false): void {
    if (reset) {
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }

    const authorFilter = this.selectedAuthorId() || undefined;

    this.momentService.listMoments(authorFilter, page, 12).subscribe({
      next: res => {
        if (reset) {
          this.moments.set(res.content || []);
          this.isLoading.set(false);
        } else {
          this.moments.update(current => [...current, ...(res.content || [])]);
          this.isLoadingMore.set(false);
        }

        this.currentPage.set(res.page);
        this.hasMore.set(!res.last);
        this.totalElements.set(res.totalElements);
      },
      error: err => {
        console.error('Failed to load moments page', err);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  selectAuthor(authorId: string | null): void {
    if (this.selectedAuthorId() === authorId) return;
    this.selectedAuthorId.set(authorId);
    this.loadMoments(0, true);
  }

  loadMore(): void {
    if (!this.hasMore() || this.isLoadingMore()) return;
    this.loadMoments(this.currentPage() + 1, false);
  }

  openComposer(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      this.dialog.open(MomentComposerSheetComponent, {
        width: '580px',
        maxWidth: '94vw',
        panelClass: 'moment-dialog-panel',
        autoFocus: false
      });
    } else {
      this.bottomSheet.open(MomentComposerSheetComponent, {
        panelClass: 'moment-sheet-panel',
        autoFocus: false
      });
    }
  }

  canEdit(moment: Moment): boolean {
    const current = this.authService.currentUser();
    if (!current) return false;
    return current.id === moment.author.id || this.authService.isAdmin();
  }

  startEditCaption(moment: Moment): void {
    this.editingMomentId.set(moment.id);
    this.editingCaptionText = moment.caption || '';
  }

  cancelEditCaption(): void {
    this.editingMomentId.set(null);
    this.editingCaptionText = '';
  }

  saveCaption(moment: Moment): void {
    if (this.isSavingCaption()) return;

    this.isSavingCaption.set(true);
    this.momentService.updateCaption(moment.id, this.editingCaptionText).subscribe({
      next: updated => {
        this.isSavingCaption.set(false);
        this.editingMomentId.set(null);
        this.moments.update(list =>
          list.map(m => (m.id === updated.id ? { ...m, caption: updated.caption, updatedAt: updated.updatedAt } : m))
        );
        this.snackBar.open('Caption updated', 'Dismiss', { duration: 2500 });
      },
      error: err => {
        this.isSavingCaption.set(false);
        console.error('Failed to update caption', err);
        this.snackBar.open('Failed to update caption', 'Dismiss', { duration: 3000 });
      }
    });
  }

  deleteMoment(moment: Moment): void {
    if (!this.authService.isAdmin()) return;

    if (!window.confirm('Are you sure you want to delete this moment? This cannot be undone.')) {
      return;
    }

    this.momentService.deleteMoment(moment.id).subscribe({
      next: () => {
        this.snackBar.open('Moment deleted', 'Dismiss', { duration: 2500 });
      },
      error: err => {
        console.error('Failed to delete moment', err);
        this.snackBar.open('Failed to delete moment', 'Dismiss', { duration: 3000 });
      }
    });
  }

  openLightbox(moment: Moment, startIndex: number = 0): void {
    if (!moment.media || moment.media.length === 0) return;

    const galleryItems: GalleryItem[] = moment.media.map((item, idx) => ({
      id: item.id || `${moment.id}-${idx}`,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl,
      mediaType: item.mediaType,
      displayOrder: item.displayOrder ?? idx,
      memoryTitle: moment.caption || 'Daily Moment',
      uploader: moment.author,
      createdAt: item.createdAt || moment.createdAt
    }));

    this.lightbox.openForItems(galleryItems, startIndex);
  }
}
