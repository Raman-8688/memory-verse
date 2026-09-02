import { Component, Input, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'mv-audio-player',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) audioUrl!: string;
  @Input() title: string = 'Voice Memo';
  @Input() authorName?: string;
  @Input() authorAvatar?: string;

  @ViewChild('audioElement') private audioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('progressBar') private progressRef!: ElementRef<HTMLDivElement>;

  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly isMuted = signal<boolean>(false);
  readonly isLoaded = signal<boolean>(false);

  readonly progressPercentage = computed<number>(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.min(100, (this.currentTime() / dur) * 100);
  });

  readonly formattedCurrentTime = computed<string>(() => {
    return this.formatTime(this.currentTime());
  });

  readonly formattedDuration = computed<string>(() => {
    return this.formatTime(this.duration());
  });

  ngOnInit(): void {}

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
        console.warn('Audio play prevented:', err);
      });
    }
  }

  stopPlayback(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.isPlaying.set(false);
  }

  onTimeUpdate(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      this.currentTime.set(audio.currentTime);
    }
  }

  onLoadedMetadata(): void {
    const audio = this.audioRef?.nativeElement;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      this.duration.set(audio.duration);
      this.isLoaded.set(true);
    }
  }

  onEnded(): void {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  seek(event: MouseEvent): void {
    const audio = this.audioRef?.nativeElement;
    const progressEl = this.progressRef?.nativeElement;
    if (!audio || !progressEl || !this.duration()) return;

    const rect = progressEl.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * this.duration();

    audio.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  toggleMute(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;

    audio.muted = !audio.muted;
    this.isMuted.set(audio.muted);
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const padM = mins < 10 ? '0' + mins : mins.toString();
    const padS = secs < 10 ? '0' + secs : secs.toString();
    return `${padM}:${padS}`;
  }
}
