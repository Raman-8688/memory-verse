import { Pipe, PipeTransform } from '@angular/core';

/**
 * Optimizes Cloudinary media URLs by dynamically injecting f_auto, q_auto, and width limits.
 * Protects bandwidth, accelerates mobile performance, and prevents serving raw 4K images.
 * Safely preserves local URLs, Unsplash URLs, and existing Cloudinary transformations.
 */
export function optimizeCloudinaryUrl(url: string | null | undefined, width = 800): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Only apply to Cloudinary delivery URLs
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  // Do not duplicate if transformation is already present
  if (url.includes('f_auto') || url.includes('q_auto') || /upload\/[^/]*w_\d+/.test(url)) {
    return url;
  }

  const transform = `f_auto,q_auto,w_${width},c_limit`;
  return url.replace('/upload/', `/upload/${transform}/`);
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
