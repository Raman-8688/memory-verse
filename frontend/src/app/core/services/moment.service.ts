import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Moment, MomentUpdateDto } from '../models/moment.model';
import { PagedResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class MomentService {
  private readonly api = inject(ApiService);

  // Reactive stream to notify active feeds when a moment is published or deleted
  private readonly momentCreatedSubject = new Subject<Moment>();
  readonly momentCreated$ = this.momentCreatedSubject.asObservable();

  private readonly momentDeletedSubject = new Subject<string>();
  readonly momentDeleted$ = this.momentDeletedSubject.asObservable();

  createMoment(files: File[], caption?: string): Observable<Moment> {
    const formData = new FormData();
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.api.upload<Moment>('/moments', formData).pipe(
      tap(created => {
        if (created) {
          this.momentCreatedSubject.next(created);
        }
      })
    );
  }

  listMoments(authorId?: string, page: number = 0, size: number = 10): Observable<PagedResponse<Moment>> {
    const params: Record<string, any> = { page, size };
    if (authorId) {
      params['authorId'] = authorId;
    }
    return this.api.get<PagedResponse<Moment>>('/moments', params);
  }

  updateCaption(id: string, caption: string): Observable<Moment> {
    const body: MomentUpdateDto = { caption: caption ? caption.trim() : '' };
    return this.api.patch<Moment>(`/moments/${id}`, body);
  }

  deleteMoment(id: string): Observable<void> {
    return this.api.delete<void>(`/moments/${id}`).pipe(
      tap(() => {
        this.momentDeletedSubject.next(id);
      })
    );
  }
}
