import { Component, OnInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { AuthService } from '@core/auth/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { DashboardResponse } from '@core/models/dashboard.model';
import { Memory } from '@core/models/memory.model';

@Component({
  selector: 'mv-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly captureService = inject(MediaCaptureService);
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') private searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('recentTrack') private recentTrackRef!: ElementRef<HTMLElement>;

  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly isLoading = signal<boolean>(true);

  searchQuery: string = '';

  readonly searchSuggestions = [
    { label: 'College Memories', query: 'Show our college memories' },
    { label: 'With Friends', query: 'Moments with my friends' },
    { label: 'Goa & Travel', query: 'Show photos from Goa and trips' },
    { label: 'Year 2024', query: 'What happened in 2024?' },
    { label: 'Celebrations', query: 'Celebrations and reunions' }
  ];

  get timeOfDayGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get formattedToday(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.dashboardService.getDashboard().subscribe({
      next: (response: DashboardResponse) => {
        this.dashboardData.set(response);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  focusSearchInput(): void {
    this.searchInputRef?.nativeElement.focus();
  }

  submitAiSearch(): void {
    const q = this.searchQuery?.trim();
    if (q) {
      this.router.navigate(['/assistant'], { queryParams: { q } });
    } else {
      this.router.navigate(['/assistant']);
    }
  }

  selectSuggestion(query: string): void {
    this.searchQuery = query;
    this.submitAiSearch();
  }

  scrollRecent(amount: number): void {
    if (this.recentTrackRef?.nativeElement) {
      this.recentTrackRef.nativeElement.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  getYearsAgo(dateStr?: string): string {
    if (!dateStr) return 'In our journey';
    const memoryYear = new Date(dateStr).getFullYear();
    const currentYear = new Date().getFullYear();
    const diff = currentYear - memoryYear;
    if (diff <= 0) return 'This year';
    if (diff === 1) return '1 year ago';
    return `${diff} years ago`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDateRange(start?: string, end?: string): string {
    if (!start) return '';
    const startYear = new Date(start).getFullYear();
    if (!end) return `${startYear} — Present`;
    const endYear = new Date(end).getFullYear();
    return startYear === endYear ? `${startYear}` : `${startYear} — ${endYear}`;
  }

  getCoverUrl(memory?: Memory): string {
    if (!memory) return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
    if (memory.coverImageUrl) return memory.coverImageUrl;
    if (memory.mediaList && memory.mediaList.length > 0) {
      const media = memory.mediaList[0];
      return media.thumbnailUrl || media.mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
  }
}
