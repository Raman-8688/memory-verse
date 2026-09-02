import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { Journey } from '@core/models/journey.model';
import { JourneyService } from '@core/services/journey.service';
import { AuthService } from '@core/auth/auth.service';
import { JourneyFormDialogComponent } from './journey-form-dialog.component';

@Component({
  selector: 'mv-journey-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './journey-list.component.html',
  styleUrl: './journey-list.component.scss'
})
export class JourneyListComponent implements OnInit {
  private readonly journeyService = inject(JourneyService);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  readonly journeys = signal<Journey[]>([]);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadJourneys();
  }

  loadJourneys(): void {
    this.isLoading.set(true);
    this.journeyService.getJourneys().subscribe({
      next: (data) => {
        this.journeys.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load journeys:', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(JourneyFormDialogComponent, {
      width: '540px'
    });

    dialogRef.afterClosed().subscribe((created: Journey | undefined) => {
      if (created) {
        this.journeys.update(list => [created, ...list]);
      }
    });
  }

  formatDateRange(startDate?: string, endDate?: string): string {
    if (!startDate) return 'Ongoing';
    const startYear = new Date(startDate).getFullYear();
    if (!endDate) return `${startYear} — Present`;
    const endYear = new Date(endDate).getFullYear();
    return startYear === endYear ? `${startYear}` : `${startYear} — ${endYear}`;
  }
}
