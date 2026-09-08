import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'mv_sidebar_collapsed';

  // Desktop collapsed state signal: true = mini variant (icons only), false = expanded (labels + icons)
  readonly isCollapsed = signal<boolean>(this.loadInitialState());

  // Mobile sidebar drawer open state signal: true = drawer open, false = closed
  readonly isMobileOpen = signal<boolean>(false);

  toggle(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.toggleMobile();
    } else {
      this.toggleDesktop();
    }
  }

  toggleDesktop(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  expand(): void {
    this.isCollapsed.set(false);
    try {
      localStorage.setItem(this.STORAGE_KEY, 'false');
    } catch {}
  }

  collapse(): void {
    this.isCollapsed.set(true);
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    } catch {}
  }

  openMobile(): void {
    this.isMobileOpen.set(true);
  }

  closeMobile(): void {
    this.isMobileOpen.set(false);
  }

  toggleMobile(): void {
    this.isMobileOpen.update(v => !v);
  }

  private loadInitialState(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  }
}
