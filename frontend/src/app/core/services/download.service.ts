import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  private readonly http = inject(HttpClient);

  // Set of URLs currently being downloaded
  readonly downloadingUrls = signal<Set<string>>(new Set());

  isDownloading(url?: string): boolean {
    if (!url) return false;
    return this.downloadingUrls().has(url);
  }

  async downloadMedia(url: string, suggestedFileName?: string): Promise<void> {
    if (!url) return;

    // Add to active downloading set
    this.downloadingUrls.update(set => {
      const next = new Set(set);
      next.add(url);
      return next;
    });

    try {
      // Determine clean filename
      let fileName = suggestedFileName;
      if (!fileName) {
        const cleanUrl = url.split('?')[0];
        fileName = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'memoryverse-media.jpg';
      }

      // Fetch as binary blob
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));

      // Create native object URL
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Clean up DOM and memory
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 200);

    } catch (err) {
      console.error('Failed to download media asset:', err);
      // Fallback: direct window open if blob fetch fails
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = suggestedFileName || 'download';
      link.click();
    } finally {
      // Remove from active downloading set
      this.downloadingUrls.update(set => {
        const next = new Set(set);
        next.delete(url);
        return next;
      });
    }
  }
}
