import { Pipe, PipeTransform } from '@angular/core';
import { resolveMediaUrl } from '../utils/media-url.util';

/**
 * Pure Angular pipe to resolve media and avatar URLs.
 * Ensures relative backend paths like "/api/media/files/..." are properly converted
 * to absolute URLs against the backend's origin, while leaving external/Cloudinary/data URLs intact.
 */
@Pipe({
  name: 'resolveMediaUrl',
  standalone: true,
  pure: true
})
export class ResolveMediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }
}
