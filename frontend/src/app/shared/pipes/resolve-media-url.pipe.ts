import { Pipe, PipeTransform } from '@angular/core';
import { resolveMediaUrl, MediaTransformationType } from '../utils/media-url.util';

/**
 * Pure Angular pipe to resolve media and avatar URLs with optional Cloudinary optimizations.
 * Ensures relative backend paths like "/api/media/files/..." are properly converted
 * to absolute URLs against the backend's origin, while applying automatic responsive
 * transformations (thumb, avatar, preview, full) for Cloudinary assets.
 */
@Pipe({
  name: 'resolveMediaUrl',
  standalone: true,
  pure: true
})
export class ResolveMediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, transformation?: MediaTransformationType): string {
    return resolveMediaUrl(url, transformation);
  }
}
