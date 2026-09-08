import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MomentComposerSheetComponent } from './moment-composer-sheet.component';

@Component({
  selector: 'mv-moment-fab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBottomSheetModule,
    MatDialogModule
  ],
  template: `
    <button
      type="button"
      class="moment-fab-btn"
      (click)="openComposer()"
      matTooltip="Share a Moment"
      matTooltipPosition="left"
      aria-label="Share a new moment">
      <div class="fab-inner-glow"></div>
      <mat-icon class="fab-icon">bolt</mat-icon>
      <span class="fab-label">Moment</span>
    </button>
  `,
  styleUrl: './moment-fab.component.scss'
})
export class MomentFabComponent {
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

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
}
