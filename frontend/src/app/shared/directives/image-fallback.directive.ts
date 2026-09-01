import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * High-resolution warm editorial fallback SVG placeholder.
 * Renders an on-brand stone/amber card with camera iconography and subtle texture
 * ensuring zero broken image icons appear across journeys and memories.
 */
const EDITORIAL_FALLBACK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none"><rect width="800" height="600" fill="%23fcfbf9"/><rect x="20" y="20" width="760" height="560" rx="16" fill="%23fef9ee" stroke="%23fde68a" stroke-width="2" stroke-dasharray="6 6"/><g transform="translate(360, 230)"><circle cx="40" cy="40" r="38" fill="%23fef3c7" stroke="%23b45309" stroke-width="2.5"/><path d="M22 47L34 32L48 48L56 39L68 53H14L22 47Z" fill="%23b45309"/><circle cx="55" cy="27" r="4.5" fill="%23b45309"/></g><text x="400" y="335" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" font-weight="600" fill="%23b45309" text-anchor="middle" letter-spacing="1.5">MEMORYVERSE ARCHIVE</text></svg>`;

@Directive({
  selector: 'img[mvFallback]',
  standalone: true
})
export class ImageFallbackDirective {
  @Input() mvFallback?: string;

  private hasFailed = false;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    if (!this.hasFailed) {
      this.hasFailed = true;
      const targetSrc = this.mvFallback && this.mvFallback.trim().length > 0 
        ? this.mvFallback 
        : EDITORIAL_FALLBACK_SVG;
      this.el.nativeElement.src = targetSrc;
    }
  }
}
