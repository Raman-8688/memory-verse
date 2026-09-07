import { Pipe, PipeTransform } from '@angular/core';
import { resolveMediaUrl } from '../utils/media-url.util';

/**
 * Optimizes Cloudinary media URLs by dynamically injecting f_auto, q_auto, and width limits.
 * Protects bandwidth, accelerates mobile performance, and prevents serving raw 4K images.
 * Safely preserves local URLs (resolving relative paths to absolute backend URLs), Unsplash URLs, and existing Cloudinary transformations.
 */
export function optimizeCloudinaryUrl(url: string | null | undefined, width = 800): string {
  const resolved = resolveMediaUrl(url);
  if (!resolved) {
    return '';
  }

  // Only apply to Cloudinary delivery URLs
  if (!resolved.includes('res.cloudinary.com') || !resolved.includes('/upload/')) {
    return resolved;
  }

  // Do not duplicate if transformation is already present
  if (resolved.includes('f_auto') || resolved.includes('q_auto') || /upload\/[^/]*w_\d+/.test(resolved)) {
    return resolved;
  }

  const transform = `f_auto,q_auto,w_${width},c_limit`;
  return resolved.replace('/upload/', `/upload/${transform}/`);
}

@Pipe({
  name: 'cloudinaryOptimize',
  standalone: true
})
export class CloudinaryOptimizePipe implements PipeTransform {
  transform(url: string | null | undefined, width = 800): string {
    return optimizeCloudinaryUrl(url, width);
  }
}
