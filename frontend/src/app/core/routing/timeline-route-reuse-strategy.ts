import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TimelineRouteReuseStrategy implements RouteReuseStrategy {
  private static storedHandles = new Map<string, DetachedRouteHandle>();
  private static scrollPositions = new Map<string, number>();

  /**
   * Determines if the route should be detached and preserved.
   * Target: 'timeline' route so pagination, DOM nodes, and scroll positions are retained.
   */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'timeline';
  }

  /**
   * Stores the detached route handle and records the container/window scroll offset.
   */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const path = route.routeConfig?.path;
    if (path === 'timeline') {
      if (handle) {
        TimelineRouteReuseStrategy.storedHandles.set(path, handle);
        const scrollContainer = typeof document !== 'undefined' ? document.querySelector('.layout-main-content') : null;
        const currentY = scrollContainer ? scrollContainer.scrollTop : (typeof window !== 'undefined' ? window.scrollY : 0);
        TimelineRouteReuseStrategy.scrollPositions.set(path, currentY);
      } else {
        TimelineRouteReuseStrategy.storedHandles.delete(path);
      }
    }
  }

  /**
   * Determines if the target route should be re-attached from our stored cache.
   */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path;
    return path === 'timeline' && TimelineRouteReuseStrategy.storedHandles.has(path);
  }

  /**
   * Retrieves the stored route handle and restores scroll position.
   */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const path = route.routeConfig?.path;
    if (path === 'timeline' && TimelineRouteReuseStrategy.storedHandles.has(path)) {
      const handle = TimelineRouteReuseStrategy.storedHandles.get(path) || null;
      const targetY = TimelineRouteReuseStrategy.scrollPositions.get(path) ?? 0;
      if (typeof window !== 'undefined' && targetY > 0) {
        setTimeout(() => {
          const scrollContainer = document.querySelector('.layout-main-content');
          if (scrollContainer) {
            scrollContainer.scrollTop = targetY;
          }
          window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        }, 30);
      }
      return handle;
    }
    return null;
  }

  /**
   * Determines if a route should be reused when navigating between matching route configs.
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  /**
   * Safely clears all cached route handles and scroll positions upon logout or account change.
   */
  static clearCache(): void {
    TimelineRouteReuseStrategy.storedHandles.clear();
    TimelineRouteReuseStrategy.scrollPositions.clear();
  }
}
