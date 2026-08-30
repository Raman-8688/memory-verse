import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly TOKEN_KEY = 'mv_auth_token';
  private readonly USER_KEY = 'mv_current_user';

  // State Signals
  readonly currentUser = signal<User | null>(this.loadUserFromStorage());
  readonly token = signal<string | null>(this.loadTokenFromStorage());

  // Derived Computed Signals
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly currentUserId = computed(() => this.currentUser()?.id || null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', userData).pipe(
      tap(response => this.setSession(response))
    );
  }

  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  setSession(authResult: AuthResponse): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.TOKEN_KEY, authResult.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));
    }
    this.token.set(authResult.token);
    this.currentUser.set(authResult.user);
  }

  updateCurrentUser(user: User): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
    this.currentUser.set(user);
  }

  private loadTokenFromStorage(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  private loadUserFromStorage(): User | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedUser = localStorage.getItem(this.USER_KEY);
      if (savedUser) {
        try {
          return JSON.parse(savedUser) as User;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}
