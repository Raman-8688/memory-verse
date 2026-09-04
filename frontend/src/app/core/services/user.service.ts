import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/user.model';
import { PersonSummary } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly api = inject(ApiService);

  getAllUsers(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  getPeopleDirectory(): Observable<PersonSummary[]> {
    return this.api.get<PersonSummary[]>('/people');
  }

  createUser(payload: { fullName: string; email: string; password: string; role: string; avatarUrl?: string }): Observable<User> {
    return this.api.post<User>('/users', payload);
  }

  updateUser(id: string, payload: { fullName: string; role: string; avatarUrl?: string }): Observable<User> {
    return this.api.put<User>(`/users/${id}`, payload);
  }

  uploadAvatar(id: string, file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<User>(`/users/${id}/avatar`, formData);
  }
}
