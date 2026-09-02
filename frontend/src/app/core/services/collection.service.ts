import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Collection, CollectionCreateDto, CollectionUpdateDto } from '../models/collection.model';
import { Memory } from '../models/memory.model';
import { PagedResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private readonly api = inject(ApiService);

  getCollections(): Observable<Collection[]> {
    return this.api.get<Collection[]>('/collections');
  }

  getCollectionById(id: string): Observable<Collection> {
    return this.api.get<Collection>(`/collections/${id}`);
  }

  createCollection(dto: CollectionCreateDto): Observable<Collection> {
    return this.api.post<Collection>('/collections', dto);
  }

  updateCollection(id: string, dto: CollectionUpdateDto): Observable<Collection> {
    return this.api.put<Collection>(`/collections/${id}`, dto);
  }

  deleteCollection(id: string): Observable<void> {
    return this.api.delete<void>(`/collections/${id}`);
  }

  getCollectionMemories(id: string, page = 0, size = 15): Observable<PagedResponse<Memory>> {
    return this.api.get<PagedResponse<Memory>>(`/collections/${id}/memories`, { page, size });
  }

  addMemoryToCollection(collectionId: string, memoryId: string): Observable<void> {
    return this.api.post<void>(`/collections/${collectionId}/memories/${memoryId}`, {});
  }

  removeMemoryFromCollection(collectionId: string, memoryId: string): Observable<void> {
    return this.api.delete<void>(`/collections/${collectionId}/memories/${memoryId}`);
  }
}
