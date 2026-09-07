import { environment } from '../../../environments/environment';

/**
 * Resolves a media URL (avatar, photo, video, etc.) to an absolute URL.
 * - If the URL is falsy or not a string, returns an empty string.
 * - If the URL is already absolute (starts with "http://", "https://", "data:", or "blob:"), returns it unchanged.
 * - Otherwise, treats it as a backend-relative path and prefixes it with the backend origin,
 *   derived by removing any trailing "/api" or "/api/" from environment.apiUrl.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Derive backend origin by removing trailing /api or /api/
  const backendOrigin = (environment.apiUrl || '').replace(/\/api\/?$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${cleanPath}`;
}
