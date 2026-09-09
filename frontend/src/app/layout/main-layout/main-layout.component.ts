import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { CommandPaletteComponent } from '@shared/components/command-palette/command-palette.component';
import { MomentFabComponent } from '@features/moments/moment-fab.component';
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
    CommandPaletteComponent,
    MomentFabComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  readonly isDashboard = signal<boolean>(false);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.updateRoute(this.router.url);
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e) => {
      this.updateRoute(e.urlAfterRedirects || e.url);
    });
  }

  private updateRoute(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isDashboard.set(cleanUrl === '/' || cleanUrl === '/dashboard');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
