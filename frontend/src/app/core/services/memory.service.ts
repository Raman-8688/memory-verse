import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { Memory, MemoryCreateDto, MemoryUpdateDto, MemoryFilterParams } from '../models/memory.model';

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getMemories(params?: MemoryFilterParams): Observable<PagedResponse<Memory>> {
    return this.api.get<PagedResponse<Memory>>('/memories', params);
  }

  getMemoryYears(): Observable<number[]> {
    return this.api.get<number[]>('/memories/years');
  }

  getMemoryById(id: string): Observable<Memory> {
    return this.api.get<Memory>(`/memories/${id}`);
  }

  toggleFavorite(id: string): Observable<Memory> {
    return this.api.post<Memory>(`/memories/${id}/favorite`, {});
  }

  createMemory(dto: MemoryCreateDto, files?: File[]): Observable<Memory> {
    if (!files || files.length === 0) {
      return this.api.post<Memory>('/memories/json', dto);
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ApiResponse<Memory>>(`${this.baseUrl}/memories`, formData).pipe(
      map(res => res.data)
    );
  }

  createMemoryWithProgress(dto: MemoryCreateDto, files?: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));

    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    return this.http.post<ApiResponse<Memory>>(`${this.baseUrl}/memories`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getTaggedMemories(userId?: string, page = 0, size = 30): Observable<PagedResponse<Memory>> {
    return this.api.get<PagedResponse<Memory>>('/memories/tagged', { userId, page, size });
  }

  updateMemory(id: string, dto: MemoryUpdateDto): Observable<Memory> {
    return this.api.put<Memory>(`/memories/${id}`, dto);
  }

  appendMediaWithProgress(id: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ApiResponse<Memory>>(`${this.baseUrl}/memories/${id}/media`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
