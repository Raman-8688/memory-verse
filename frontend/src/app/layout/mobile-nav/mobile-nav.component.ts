import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MediaCaptureService } from '@core/services/media-capture.service';

@Component({
  selector: 'mv-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatBottomSheetModule],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss'
})
export class MobileNavComponent {
  private readonly captureService = inject(MediaCaptureService);

  openCapture(): void {
    this.captureService.openCaptureFlow();
  }
}
