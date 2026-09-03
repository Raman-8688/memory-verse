import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { LightboxService } from '@core/services/lightbox.service';
import { ShareService, PublicSharedData } from '@core/services/share.service';
import { Memory, Media } from '@core/models/memory.model';

@Component({
  selector: 'mv-public-share',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    ImageFallbackDirective,
    AudioPlayerComponent
  ],
  templateUrl: './public-share.component.html',
  styleUrl: './public-share.component.scss'
})
export class PublicShareComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shareService = inject(ShareService);
  private readonly lightboxService = inject(LightboxService);
  private readonly snackBar = inject(MatSnackBar);

  readonly token = signal<string>('');
  readonly payload = signal<PublicSharedData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly isExporting = signal<boolean>(false);

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.paramMap.get('token');
    if (!tokenParam) {
      this.hasError.set(true);
      this.errorMessage.set('Invalid or missing shared link.');
      this.isLoading.set(false);
      return;
    }

    this.token.set(tokenParam);
    this.loadSharedContent(tokenParam);
  }

  loadSharedContent(token: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.shareService.getPublicData(token).subscribe({
      next: (data) => {
        this.payload.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.hasError.set(true);
        this.errorMessage.set(err.error?.message || 'This memory link has expired or been revoked.');
        this.isLoading.set(false);
      }
    });
  }

  getCoverMedia(m?: Memory): Media | null {
    if (!m || !m.mediaList || m.mediaList.length === 0) return null;
    const visual = m.mediaList.filter(item => item.mediaType === 'IMAGE' || item.mediaType === 'VIDEO');
    return visual.length > 0 ? visual[0] : null;
  }

  getAudioMedia(mediaList?: Media[]): Media[] {
    if (!mediaList) return [];
    return mediaList.filter(m => m.mediaType === 'AUDIO');
  }

  getVisualMedia(mediaList?: Media[]): Media[] {
    if (!mediaList) return [];
    return mediaList.filter(m => m.mediaType === 'IMAGE' || m.mediaType === 'VIDEO');
  }

  openLightbox(mediaList: Media[], startIndex: number): void {
    const memory = this.payload()?.memory;
    if (memory) {
      this.lightboxService.openForMemory(memory, startIndex);
    }
  }

  copyShareLink(): void {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.snackBar.open('Link copied to clipboard!', 'Close', { duration: 3000 });
      });
    }
  }

  exportPrintableKeepsake(): void {
    const data = this.payload();
    if (!data) return;

    if (data.resourceType === 'MEMORY' && data.memory) {
      window.open(this.shareService.getMemoryBookUrl(data.memory.id), '_blank');
    } else if (data.resourceType === 'JOURNEY' && data.journey) {
      window.open(this.shareService.getJourneyBookUrl(data.journey.id), '_blank');
    }
  }

  downloadArchiveZip(): void {
    const data = this.payload();
    if (!data) return;

    this.isExporting.set(true);
    if (data.resourceType === 'MEMORY' && data.memory) {
      this.shareService.downloadMemoryZip(data.memory.id).subscribe({
        next: (blob) => {
          this.isExporting.set(false);
          this.saveBlob(blob, `memory-${data.memory?.id}-keepsake.zip`);
        },
        error: () => {
          this.isExporting.set(false);
          this.snackBar.open('Unable to download archive', 'Close', { duration: 3000 });
        }
      });
    } else if (data.resourceType === 'JOURNEY' && data.journey) {
      this.shareService.downloadJourneyZip(data.journey.id).subscribe({
        next: (blob) => {
          this.isExporting.set(false);
          this.saveBlob(blob, `journey-${data.journey?.id}-keepsake.zip`);
        },
        error: () => {
          this.isExporting.set(false);
          this.snackBar.open('Unable to download archive', 'Close', { duration: 3000 });
        }
      });
    }
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
}
