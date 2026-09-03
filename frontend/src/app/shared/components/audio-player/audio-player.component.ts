import { Component, Input, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MediaService } from '@core/services/media.service';

@Component({
  selector: 'mv-audio-player',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) audioUrl!: string;
  @Input() title: string = 'Voice Memo';
  @Input() authorName?: string;
  @Input() authorAvatar?: string;
  @Input() transcript?: string;
  @Input() mediaId?: string;

  @ViewChild('audioElement') private audioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('progressBar') private progressRef!: ElementRef<HTMLDivElement>;

  private readonly mediaService = inject(MediaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly isLoaded = signal<boolean>(false);
  readonly isMuted = signal<boolean>(false);
  readonly volume = signal<number>(1);

  // Transcript state
  readonly showTranscript = signal<boolean>(false);
  readonly isEditingTranscript = signal<boolean>(false);
  readonly currentTranscript = signal<string>('');
  readonly isSavingTranscript = signal<boolean>(false);
  editedTranscriptText: string = '';

  readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  readonly formattedDuration = computed(() => this.formatTime(this.duration()));
  readonly progressPercent = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  });

  // 16 stylized wave height bars for visual animation
  readonly waveformBars = [40, 65, 85, 45, 95, 75, 50, 80, 100, 60, 90, 45, 70, 85, 55, 35];

  ngOnInit(): void {
    if (this.transcript) {
      this.currentTranscript.set(this.transcript);
      this.editedTranscriptText = this.transcript;
    }
  }

  ngOnDestroy(): void {
    this.stopPlayback();
  }

  togglePlay(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;

    if (this.isPlaying()) {
      audio.pause();
      this.isPlaying.set(false);
    } else {
      audio.play().then(() => {
        this.isPlaying.set(true);
      }).catch(err => {
        console.error('Audio playback failed:', err);
      });
    }
  }

  stopPlayback(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.isPlaying.set(false);
      this.currentTime.set(0);
    }
  }

  onTimeUpdate(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      this.currentTime.set(audio.currentTime);
    }
  }

  onLoadedMetadata(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      this.duration.set(audio.duration || 0);
      this.isLoaded.set(true);
    }
  }

  onAudioEnded(): void {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  seek(event: MouseEvent): void {
    const progressEl = this.progressRef?.nativeElement;
    const audio = this.audioRef?.nativeElement;
    if (!progressEl || !audio || !this.duration()) return;

    const rect = progressEl.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    
    audio.currentTime = percentage * this.duration();
    this.currentTime.set(audio.currentTime);
  }

  toggleMute(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    audio.muted = !audio.muted;
    this.isMuted.set(audio.muted);
  }

  toggleTranscript(): void {
    this.showTranscript.update(v => !v);
  }

  startEditingTranscript(): void {
    this.editedTranscriptText = this.currentTranscript() || '';
    this.isEditingTranscript.set(true);
  }

  cancelEditingTranscript(): void {
    this.isEditingTranscript.set(false);
  }

  saveTranscript(): void {
    if (!this.mediaId) {
      this.currentTranscript.set(this.editedTranscriptText);
      this.isEditingTranscript.set(false);
      return;
    }

    this.isSavingTranscript.set(true);
    this.mediaService.updateTranscript(this.mediaId, this.editedTranscriptText).subscribe({
      next: (updated) => {
        this.isSavingTranscript.set(false);
        this.currentTranscript.set(updated.transcript || this.editedTranscriptText);
        this.isEditingTranscript.set(false);
        this.snackBar.open('Audio transcript updated!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isSavingTranscript.set(false);
        this.snackBar.open('Failed to save transcript', 'Close', { duration: 3000 });
      }
    });
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
