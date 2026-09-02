import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'mv_sidebar_collapsed';

  // Collapsed state signal: true = mini variant (icons only), false = expanded (labels + icons)
  readonly isCollapsed = signal<boolean>(this.loadInitialState());

  toggle(): void {
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

  private loadInitialState(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  }
}
