import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { CommandPaletteComponent } from '@shared/components/command-palette/command-palette.component';
import { SidebarService } from '@core/services/sidebar.service';

@Component({
  selector: 'mv-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    SidebarComponent, 
    MobileNavComponent,
    CommandPaletteComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  readonly sidebarService = inject(SidebarService);
}
