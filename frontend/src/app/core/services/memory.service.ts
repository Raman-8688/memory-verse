import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { Memory, MemoryCreateDto, MemoryFilterParams } from '../models/memory.model';

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

  getMemoryById(id: string): Observable<Memory> {
    return this.api.get<Memory>(`/memories/${id}`);
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
}
