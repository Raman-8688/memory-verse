import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PagedResponse } from '../models/api-response.model';
import { GalleryFilterParams, GalleryItem } from '../models/gallery.model';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly api = inject(ApiService);

  getGallery(params?: GalleryFilterParams): Observable<PagedResponse<GalleryItem>> {
    return this.api.get<PagedResponse<GalleryItem>>('/gallery', params);
  }
}
