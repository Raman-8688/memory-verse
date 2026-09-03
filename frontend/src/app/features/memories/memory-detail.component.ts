import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { Memory, Media } from '@core/models/memory.model';
import { GalleryItem } from '@core/models/gallery.model';
import { MemoryComment, ReactionSummary } from '@core/models/interaction.model';
import { MemoryService } from '@core/services/memory.service';
import { InteractionService } from '@core/services/interaction.service';
import { ShareService } from '@core/services/share.service';
import { AuthService } from '@core/auth/auth.service';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MemoryEditDialogComponent } from './memory-edit-dialog.component';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { NotificationStateService } from '@core/services/notification-state.service';
import { AddToCollectionDialogComponent } from '@shared/components/add-to-collection-dialog/add-to-collection-dialog.component';

@Component({
  selector: 'mv-memory-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ImageFallbackDirective,
    AudioPlayerComponent
  ],
  templateUrl: './memory-detail.component.html',
  styleUrl: './memory-detail.component.scss'
})
export class MemoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memoryService = inject(MemoryService);
  private readonly interactionService = inject(InteractionService);
  private readonly shareService = inject(ShareService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly memory = signal<Memory | null>(null);
  readonly relatedMemories = signal<Memory[]>([]);
  readonly activeMedia = signal<Media | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isUploadingMedia = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  readonly isSharing = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // Interaction Signals
  readonly comments = signal<MemoryComment[]>([]);
  readonly reactions = signal<ReactionSummary[]>([]);
  readonly isLoadingComments = signal<boolean>(false);
  readonly isSubmittingComment = signal<boolean>(false);
  newCommentText: string = '';
  readonly availableEmojis: string[] = ['❤️', '😂', '🥺', '🥂', '✨'];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadMemory(id);
      }
    });
  }

  loadMemory(id: string): void {
    this.isLoading.set(true);
    this.memoryService.getMemoryById(id).subscribe({
      next: (data: Memory) => {
        this.memory.set(data);
        if (data.mediaList && data.mediaList.length > 0) {
          this.activeMedia.set(data.mediaList[0]);
        }
        this.loadRelatedMemories(data);
        this.loadComments(id);
        this.loadReactions(id);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load memory:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadRelatedMemories(current: Memory): void {
    if (current.journeyId) {
      this.memoryService.getMemories({ journeyId: current.journeyId, size: 8 }).subscribe({
        next: (res) => {
          const list = (res.content || []).filter(m => m.id !== current.id);
          this.relatedMemories.set(list);
        },
        error: () => this.relatedMemories.set([])
      });
    } else if (current.locationName) {
      this.memoryService.getMemories({ search: current.locationName, size: 8 }).subscribe({
        next: (res) => {
          const list = (res.content || []).filter(m => m.id !== current.id);
          this.relatedMemories.set(list);
        },
        error: () => this.relatedMemories.set([])
      });
    } else {
      this.relatedMemories.set([]);
    }
  }

  getCoverUrl(m: Memory): string {
    if (m.mediaList && m.mediaList.length > 0) {
      return m.mediaList[0].thumbnailUrl || m.mediaList[0].mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80';
  }

  setActiveMedia(media: Media): void {
    this.activeMedia.set(media);
  }

  openLightbox(startIndex: number = 0): void {
    const mem = this.memory();
    if (!mem || !mem.mediaList || mem.mediaList.length === 0) return;

    const galleryItems: GalleryItem[] = mem.mediaList.map(m => ({
      id: m.id,
      mediaUrl: m.mediaUrl,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType,
      fileName: m.fileName,
      width: m.width,
      height: m.height,
      durationSeconds: m.durationSeconds,
      displayOrder: m.displayOrder,
      memoryId: mem.id,
      memoryTitle: mem.title,
      memoryDate: mem.memoryDate,
      locationName: mem.locationName,
      journeyId: mem.journeyId,
      journeyTitle: mem.journeyTitle,
      uploader: mem.createdBy,
      taggedUsers: mem.taggedUsers,
      createdAt: m.createdAt
    }));

    this.dialog.open(MediaViewerModalComponent, {
      data: { items: galleryItems, startIndex },
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
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  canEdit(): boolean {
    const user = this.authService.currentUser();
    const m = this.memory();
    if (!user || !m) return false;
    return user.id === m.createdBy?.id || this.authService.isAdmin();
  }

  openEditDialog(m: Memory): void {
    const ref = this.dialog.open(MemoryEditDialogComponent, {
      data: m,
      width: '580px',
      maxHeight: '85vh'
    });

    ref.afterClosed().subscribe((updated: Memory | undefined) => {
      if (updated) {
        this.memory.set(updated);
        // Instant Hero Update Fix: update activeMedia immediately when media is added
        if (updated.mediaList && updated.mediaList.length > 0) {
          const currentActive = this.activeMedia();
          if (!currentActive || !updated.mediaList.some(med => med.id === currentActive.id) || !currentActive.mediaUrl) {
            this.activeMedia.set(updated.mediaList[0]);
          }
        }
        this.loadRelatedMemories(updated);
        this.notificationState.refresh();
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const rawFiles = Array.from(input.files);
    // Crucially reset input value immediately so browser doesn't refire
    input.value = '';

    if (this.isUploadingMedia()) return;

    // Deduplicate files by name and size
    const existingFileNames = new Set(this.memory()?.mediaList?.map(med => med.fileName) || []);
    const seen = new Set<string>();
    const files: File[] = [];
    for (const f of rawFiles) {
      const key = `${f.name}_${f.size}`;
      if (!seen.has(key) && !existingFileNames.has(f.name)) {
        seen.add(key);
        files.push(f);
      }
    }

    if (files.length === 0) {
      this.snackBar.open('Selected photos are already attached to this memory.', 'OK', { duration: 3000 });
      return;
    }

    const m = this.memory();
    if (!m) return;

    this.isUploadingMedia.set(true);
    this.uploadProgress.set(0);

    this.memoryService.appendMediaWithProgress(m.id, files).subscribe({
      next: (httpEvent) => {
        if (httpEvent.type === HttpEventType.UploadProgress) {
          if (httpEvent.total) {
            const progress = Math.round((100 * httpEvent.loaded) / httpEvent.total);
            this.uploadProgress.set(progress);
          }
        } else if (httpEvent.type === HttpEventType.Response) {
          this.isUploadingMedia.set(false);
          const updatedMemory: Memory = httpEvent.body?.data || httpEvent.body;
          if (updatedMemory) {
            this.memory.set(updatedMemory);
            if (updatedMemory.mediaList && updatedMemory.mediaList.length > 0) {
              // Update hero immediately!
              this.activeMedia.set(updatedMemory.mediaList[0]);
            }
            this.loadRelatedMemories(updatedMemory);
          }
          this.notificationState.refresh();
          this.snackBar.open(`${files.length} photo(s) added successfully!`, 'OK', { duration: 3500 });
        }
      },
      error: (err) => {
        this.isUploadingMedia.set(false);
        console.error('Failed to append media:', err);
        const msg = err.error?.message || 'Failed to upload photos. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  toggleFavorite(): void {
    const mem = this.memory();
    if (!mem) return;
    const prev = mem.isFavorite;
    mem.isFavorite = !prev;
    this.memory.set({ ...mem });

    this.memoryService.toggleFavorite(mem.id).subscribe({
      next: (updated) => {
        this.memory.set({ ...mem, isFavorite: updated.isFavorite });
        this.snackBar.open(updated.isFavorite ? 'Saved to favorites' : 'Removed from favorites', 'Close', { duration: 2500 });
      },
      error: () => {
        this.memory.set({ ...mem, isFavorite: prev });
        this.snackBar.open('Unable to update favorite', 'Close', { duration: 3000 });
      }
    });
  }

  openAddToCollection(): void {
    const mem = this.memory();
    if (!mem) return;
    this.dialog.open(AddToCollectionDialogComponent, {
      data: { memory: mem },
      width: '460px',
      panelClass: 'mv-dialog-panel'
    });
  }

  // --- COMMENTS & NOSTALGIA THREADS ---

  loadComments(memoryId: string): void {
    this.isLoadingComments.set(true);
    this.interactionService.getComments(memoryId, 0, 50).subscribe({
      next: (res) => {
        this.comments.set(res.content || []);
        this.isLoadingComments.set(false);
      },
      error: () => {
        this.isLoadingComments.set(false);
      }
    });
  }

  submitComment(): void {
    const mem = this.memory();
    const text = this.newCommentText.trim();
    if (!mem || !text || this.isSubmittingComment()) return;

    this.isSubmittingComment.set(true);
    this.interactionService.addComment(mem.id, text).subscribe({
      next: (created) => {
        this.comments.update(list => [...list, created]);
        this.newCommentText = '';
        this.isSubmittingComment.set(false);
        this.snackBar.open('Margin note shared', 'Close', { duration: 2500 });
      },
      error: () => {
        this.isSubmittingComment.set(false);
        this.snackBar.open('Unable to post note', 'Close', { duration: 3000 });
      }
    });
  }

  deleteComment(commentId: string): void {
    const mem = this.memory();
    if (!mem) return;

    this.interactionService.deleteComment(mem.id, commentId).subscribe({
      next: () => {
        this.comments.update(list => list.filter(c => c.id !== commentId));
        this.snackBar.open('Note removed', 'Close', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('Unable to delete note', 'Close', { duration: 3000 });
      }
    });
  }

  canDeleteComment(comment: MemoryComment): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (comment.user.id === user.id) return true;
    const mem = this.memory();
    return !!(mem && mem.createdBy.id === user.id);
  }

  // --- REACTIONS ---

  loadReactions(memoryId: string): void {
    this.interactionService.getReactions(memoryId).subscribe({
      next: (res) => {
        this.reactions.set(res || []);
      },
      error: () => {}
    });
  }

  toggleReaction(emoji: string): void {
    const mem = this.memory();
    if (!mem) return;

    // Optimistic UI update
    const current = this.reactions();
    const existing = current.find(r => r.emoji === emoji);
    const prevReacted = existing ? existing.reactedByCurrentUser : false;

    this.interactionService.toggleReaction(mem.id, emoji).subscribe({
      next: (updated) => {
        this.reactions.set(updated);
      },
      error: () => {
        this.snackBar.open('Unable to update reaction', 'Close', { duration: 2500 });
      }
    });
  }

  hasReacted(emoji: string): boolean {
    const r = this.reactions().find(item => item.emoji === emoji);
    return r ? r.reactedByCurrentUser : false;
  }

  getReactionCount(emoji: string): number {
    const r = this.reactions().find(item => item.emoji === emoji);
    return r ? r.count : 0;
  }

  // --- AUDIO MEDIA HELPER ---

  getAudioMedia(mem: Memory | null): Media[] {
    if (!mem || !mem.mediaList) return [];
    return mem.mediaList.filter(m => m.mediaType === 'AUDIO');
  }

  // --- SHARE & EXPORT ACTIONS ---

  shareMemory(): void {
    const mem = this.memory();
    if (!mem) return;

    this.isSharing.set(true);
    this.shareService.createShareLink('MEMORY', mem.id).subscribe({
      next: (res) => {
        this.isSharing.set(false);
        const fullUrl = `${window.location.origin}${res.shareUrl}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
          this.snackBar.open('Public keepsake link copied to clipboard!', 'Close', { duration: 4000 });
        }).catch(() => {
          this.snackBar.open(`Share link: ${fullUrl}`, 'Close', { duration: 6000 });
        });
      },
      error: () => {
        this.isSharing.set(false);
        this.snackBar.open('Failed to generate share link', 'Close', { duration: 3000 });
      }
    });
  }

  exportKeepsakeBook(): void {
    const mem = this.memory();
    if (!mem) return;
    window.open(this.shareService.getMemoryBookUrl(mem.id), '_blank');
  }

  downloadArchiveZip(): void {
    const mem = this.memory();
    if (!mem) return;

    this.isExporting.set(true);
    this.snackBar.open('Packaging keepsake archive...', undefined, { duration: 2000 });
    this.shareService.downloadMemoryZip(mem.id).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memory-${mem.id}-keepsake.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Keepsake archive downloaded!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isExporting.set(false);
        this.snackBar.open('Failed to download keepsake archive', 'Close', { duration: 3000 });
      }
    });
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
