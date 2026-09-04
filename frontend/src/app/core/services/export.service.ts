import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly http = inject(HttpClient);

  exportMemoryZip(memoryId: string): Observable<Blob> {
    return this.http.get(`/api/export/memory/${memoryId}/zip`, { responseType: 'blob' });
  }

  exportJourneyZip(journeyId: string): Observable<Blob> {
    return this.http.get(`/api/export/journey/${journeyId}/zip`, { responseType: 'blob' });
  }

  openMemoryKeepsakeBook(memoryId: string): void {
    window.open(`/api/export/memory/${memoryId}/book`, '_blank');
  }

  openJourneyKeepsakeBook(journeyId: string): void {
    window.open(`/api/export/journey/${journeyId}/book`, '_blank');
  }

  triggerDownloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
