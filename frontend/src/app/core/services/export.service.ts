import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  exportMemoryZip(memoryId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/memory/${memoryId}/zip`, { responseType: 'blob' });
  }

  exportJourneyZip(journeyId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/journey/${journeyId}/zip`, { responseType: 'blob' });
  }

  openMemoryKeepsakeBook(memoryId: string): void {
    window.open(`${this.baseUrl}/export/memory/${memoryId}/book`, '_blank');
  }

  openJourneyKeepsakeBook(journeyId: string): void {
    window.open(`${this.baseUrl}/export/journey/${journeyId}/book`, '_blank');
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
