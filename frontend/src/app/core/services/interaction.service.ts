import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PagedResponse } from '../models/api-response.model';
import { MemoryComment, ReactionSummary } from '../models/interaction.model';

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  private readonly api = inject(ApiService);

  getComments(memoryId: string, page: number = 0, size: number = 20): Observable<PagedResponse<MemoryComment>> {
    return this.api.get<PagedResponse<MemoryComment>>(`/memories/${memoryId}/comments`, { page, size });
  }

  addComment(memoryId: string, content: string): Observable<MemoryComment> {
    return this.api.post<MemoryComment>(`/memories/${memoryId}/comments`, { content });
  }

  deleteComment(memoryId: string, commentId: string): Observable<void> {
    return this.api.delete<void>(`/memories/${memoryId}/comments/${commentId}`);
  }

  getReactions(memoryId: string): Observable<ReactionSummary[]> {
    return this.api.get<ReactionSummary[]>(`/memories/${memoryId}/reactions`);
  }

  toggleReaction(memoryId: string, emoji: string): Observable<ReactionSummary[]> {
    return this.api.post<ReactionSummary[]>(`/memories/${memoryId}/reactions/${encodeURIComponent(emoji)}`, {});
  }
}
