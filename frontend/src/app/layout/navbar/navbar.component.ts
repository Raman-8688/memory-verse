import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { AuthService } from '@core/auth/auth.service';
import { NotificationStateService } from '@core/services/notification-state.service';
import { MediaCaptureService } from '@core/services/media-capture.service';

@Component({
  selector: 'mv-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule, MatBottomSheetModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly notificationState = inject(NotificationStateService);
  readonly captureService = inject(MediaCaptureService);
}
