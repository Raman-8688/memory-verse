import { environment } from '../../../environments/environment';

export type MediaTransformationType = 'thumb' | 'avatar' | 'preview' | 'full';

/**
 * Resolves a media URL (avatar, photo, video, etc.) to an absolute URL with optional Cloudinary optimizations.
 * - If the URL is falsy or not a string, returns an empty string.
 * - If the URL is a Cloudinary asset, applies auto-format, quality optimization, and responsive dimension constraints.
 * - If the URL is already absolute (starts with "http://", "https://", "data:", or "blob:"), returns it with applicable transformations.
 * - Otherwise, treats it as a backend-relative path and prefixes it with the backend origin.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  transformation?: MediaTransformationType
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  let resolvedUrl = trimmed;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    resolvedUrl = trimmed;
  } else {
    // Derive backend origin by removing trailing /api or /api/
    const backendOrigin = (environment.apiUrl || '').replace(/\/api\/?$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    resolvedUrl = `${backendOrigin}${cleanPath}`;
  }

  // Cloudinary On-the-Fly Optimization
  if (transformation && transformation !== 'full' && resolvedUrl.includes('cloudinary.com') && resolvedUrl.includes('/upload/')) {
    // Only inject if there isn't already a transformation string following /upload/
    if (resolvedUrl.match(/\/upload\/(?:v\d+\/|[^\/]+\.[a-zA-Z0-9]+)/)) {
      let transformParam = 'f_auto,q_auto';
      if (transformation === 'thumb') {
        transformParam = 'w_500,c_limit,f_auto,q_auto';
      } else if (transformation === 'avatar') {
        transformParam = 'w_120,h_120,c_fill,g_face,f_auto,q_auto';
      } else if (transformation === 'preview') {
        transformParam = 'w_900,c_limit,f_auto,q_auto';
      }
      resolvedUrl = resolvedUrl.replace('/upload/', `/upload/${transformParam}/`);
    }
  }

  return resolvedUrl;
}
