import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/auth.service';
import { NotificationStateService } from '@core/services/notification-state.service';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { CommandPaletteService } from '@core/services/command-palette.service';
import { SidebarService } from '@core/services/sidebar.service';

@Component({
  selector: 'mv-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatBottomSheetModule,
    MatTooltipModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly notificationState = inject(NotificationStateService);
  readonly captureService = inject(MediaCaptureService);
  readonly paletteService = inject(CommandPaletteService);
  readonly sidebarService = inject(SidebarService);
}
