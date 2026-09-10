import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import {
  ChatGroupSummary,
  ChatGroupDetail,
  ChatGroupMember,
  ChatGroupRole,
  ChatMessage,
  ChatMessageReaction,
  ChatMessageSearchResult,
  ChatMediaItem,
  ChatGroupCreateDto,
  ChatGroupUpdateDto,
  ChatMemberAddDto,
  ChatMessageSendDto,
  SignedDocumentUrlResponse
} from '../models/chat.model';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  private readonly groupCreatedSubject = new Subject<ChatGroupDetail>();
  readonly groupCreated$ = this.groupCreatedSubject.asObservable();

  private readonly groupUpdatedSubject = new Subject<ChatGroupDetail>();
  readonly groupUpdated$ = this.groupUpdatedSubject.asObservable();

  private readonly groupArchivedSubject = new Subject<string>();
  readonly groupArchived$ = this.groupArchivedSubject.asObservable();

  getUserGroups(query?: string, page: number = 0, size: number = 20): Observable<PagedResponse<ChatGroupSummary>> {
    const params: Record<string, any> = { page, size };
    if (query && query.trim()) {
      params['query'] = query.trim();
    }
    return this.api.get<PagedResponse<ChatGroupSummary>>('/chat/groups', params);
  }

  getGroupDetail(groupId: string): Observable<ChatGroupDetail> {
    return this.api.get<ChatGroupDetail>(`/chat/groups/${groupId}`);
  }

  getGroupMembers(groupId: string): Observable<ChatGroupMember[]> {
    return this.api.get<ChatGroupMember[]>(`/chat/groups/${groupId}/members`);
  }

  getGroupPresence(groupId: string): Observable<string[]> {
    return this.api.get<string[]>(`/chat/groups/${groupId}/presence`);
  }

  createGroup(dto: ChatGroupCreateDto): Observable<ChatGroupDetail> {
    return this.api.post<ChatGroupDetail>('/chat/groups', dto).pipe(
      tap(created => {
        if (created) {
          this.groupCreatedSubject.next(created);
        }
      })
    );
  }

  updateGroup(groupId: string, dto: ChatGroupUpdateDto): Observable<ChatGroupDetail> {
    return this.api.put<ChatGroupDetail>(`/chat/groups/${groupId}`, dto).pipe(
      tap(updated => {
        if (updated) {
          this.groupUpdatedSubject.next(updated);
        }
      })
    );
  }

  uploadGroupAvatar(groupId: string, file: File): Observable<ChatGroupDetail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<ChatGroupDetail>(`/chat/groups/${groupId}/avatar`, formData).pipe(
      tap(updated => {
        if (updated) {
          this.groupUpdatedSubject.next(updated);
        }
      })
    );
  }

  updateMemberRole(groupId: string, userId: string, role: ChatGroupRole): Observable<void> {
    return this.api.patch<void>(`/chat/groups/${groupId}/members/${userId}/role`, { role });
  }

  archiveGroup(groupId: string): Observable<void> {
    return this.api.delete<void>(`/chat/groups/${groupId}`).pipe(
      tap(() => {
        this.groupArchivedSubject.next(groupId);
      })
    );
  }

  addMember(groupId: string, dto: ChatMemberAddDto): Observable<void> {
    return this.api.post<void>(`/chat/groups/${groupId}/members`, dto);
  }

  removeMember(groupId: string, userId: string): Observable<void> {
    return this.api.delete<void>(`/chat/groups/${groupId}/members/${userId}`);
  }

  leaveGroup(groupId: string): Observable<void> {
    return this.api.post<void>(`/chat/groups/${groupId}/leave`, {});
  }

  markMessagesAsRead(groupId: string, lastReadMessageId?: string): Observable<void> {
    const params: Record<string, any> = {};
    if (lastReadMessageId) {
      params['lastReadMessageId'] = lastReadMessageId;
    }
    return this.api.post<void>(`/chat/groups/${groupId}/read`, {}, params);
  }

  getGroupMessages(groupId: string, page: number = 0, size: number = 30): Observable<PagedResponse<ChatMessage>> {
    return this.api.get<PagedResponse<ChatMessage>>(`/chat/groups/${groupId}/messages`, { page, size });
  }

  searchGroupMessages(groupId: string, query: string, page: number = 0, size: number = 20): Observable<PagedResponse<ChatMessageSearchResult>> {
    return this.api.get<PagedResponse<ChatMessageSearchResult>>(`/chat/groups/${groupId}/messages/search`, { q: query, page, size });
  }

  getGroupMedia(groupId: string, page: number = 0, size: number = 30): Observable<PagedResponse<ChatMediaItem>> {
    return this.api.get<PagedResponse<ChatMediaItem>>(`/chat/groups/${groupId}/media`, { page, size });
  }

  getGroupFiles(groupId: string, page: number = 0, size: number = 30): Observable<PagedResponse<ChatMediaItem>> {
    return this.api.get<PagedResponse<ChatMediaItem>>(`/chat/groups/${groupId}/files`, { page, size });
  }

  sendMessage(groupId: string, dto: ChatMessageSendDto): Observable<ChatMessage> {
    return this.api.post<ChatMessage>(`/chat/groups/${groupId}/messages`, dto);
  }

  uploadImageMessage(
    groupId: string,
    file: File,
    caption?: string,
    clientMessageId?: string,
    replyToMessageId?: string
  ): Observable<HttpEvent<ApiResponse<ChatMessage>>> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }
    if (clientMessageId) {
      formData.append('clientMessageId', clientMessageId);
    }
    if (replyToMessageId) {
      formData.append('replyToMessageId', replyToMessageId);
    }

    const url = `${environment.apiUrl}/chat/groups/${groupId}/images`;
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true
    });

    return this.http.request<ApiResponse<ChatMessage>>(req);
  }

  uploadVideoMessage(
    groupId: string,
    file: File,
    caption?: string,
    clientMessageId?: string,
    replyToMessageId?: string
  ): Observable<HttpEvent<ApiResponse<ChatMessage>>> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }
    if (clientMessageId) {
      formData.append('clientMessageId', clientMessageId);
    }
    if (replyToMessageId) {
      formData.append('replyToMessageId', replyToMessageId);
    }

    const url = `${environment.apiUrl}/chat/groups/${groupId}/videos`;
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true
    });

    return this.http.request<ApiResponse<ChatMessage>>(req);
  }

  uploadFileMessage(
    groupId: string,
    file: File,
    caption?: string,
    clientMessageId?: string,
    replyToMessageId?: string
  ): Observable<HttpEvent<ApiResponse<ChatMessage>>> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }
    if (clientMessageId) {
      formData.append('clientMessageId', clientMessageId);
    }
    if (replyToMessageId) {
      formData.append('replyToMessageId', replyToMessageId);
    }

    const url = `${environment.apiUrl}/chat/groups/${groupId}/files`;
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true
    });

    return this.http.request<ApiResponse<ChatMessage>>(req);
  }

  editMessage(messageId: string, textContent: string): Observable<ChatMessage> {
    return this.api.patch<ChatMessage>(`/chat/messages/${messageId}`, { textContent });
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.api.delete<void>(`/chat/messages/${messageId}`);
  }

  toggleReaction(messageId: string, reactionCode: string): Observable<void> {
    return this.api.post<void>(`/chat/messages/${messageId}/reactions`, { reactionCode });
  }

  getMessageReactions(messageId: string): Observable<ChatMessageReaction[]> {
    return this.api.get<ChatMessageReaction[]>(`/chat/messages/${messageId}/reactions`);
  }

  getDocumentSignedUrl(groupId: string, messageId: string): Observable<SignedDocumentUrlResponse> {
    return this.api.get<SignedDocumentUrlResponse>(`/chat/groups/${groupId}/messages/${messageId}/document-url`);
  }
}
