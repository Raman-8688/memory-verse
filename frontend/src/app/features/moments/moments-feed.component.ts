import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Moment, MomentMedia } from '@core/models/moment.model';
import { MomentService } from '@core/services/moment.service';
import { AuthService } from '@core/auth/auth.service';
import { LightboxService } from '@core/services/lightbox.service';
import { GalleryItem } from '@core/models/gallery.model';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';

@Component({
  selector: 'mv-moments-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TimeAgoPipe,
    ResolveMediaUrlPipe,
    ImageFallbackDirective
  ],
  templateUrl: './moments-feed.component.html',
  styleUrl: './moments-feed.component.scss'
})
export class MomentsFeedComponent implements OnInit, OnDestroy {
  @Input() limit: number = 10;
  @Input() showHeader: boolean = true;
  @Input() showViewAll: boolean = true;
  @Input() authorId?: string;

  private readonly momentService = inject(MomentService);
  readonly authService = inject(AuthService);
  private readonly lightbox = inject(LightboxService);
  private readonly snackBar = inject(MatSnackBar);

  readonly moments = signal<Moment[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Inline editing state for captions
  readonly editingMomentId = signal<string | null>(null);
  editingCaptionText = '';
  readonly isSavingCaption = signal<boolean>(false);

  private subCreated?: Subscription;
  private subDeleted?: Subscription;

  ngOnInit(): void {
    this.loadMoments();

    // Reactively prepend newly shared moments
    this.subCreated = this.momentService.momentCreated$.subscribe(newMoment => {
      if (!this.authorId || this.authorId === newMoment.author.id) {
        this.moments.update(list => {
          // Avoid duplicates if already present
          if (list.some(m => m.id === newMoment.id)) return list;
          return [newMoment, ...list];
        });
      }
    });

    // Reactively remove deleted moments
    this.subDeleted = this.momentService.momentDeleted$.subscribe(deletedId => {
      this.moments.update(list => list.filter(m => m.id !== deletedId));
    });
  }

  ngOnDestroy(): void {
    this.subCreated?.unsubscribe();
    this.subDeleted?.unsubscribe();
  }

  loadMoments(): void {
    this.isLoading.set(true);
    this.momentService.listMoments(this.authorId, 0, this.limit).subscribe({
      next: paged => {
        this.moments.set(paged.content || []);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load moments', err);
        this.isLoading.set(false);
      }
    });
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
