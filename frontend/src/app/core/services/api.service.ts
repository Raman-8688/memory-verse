import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PageRequestParams } from '../models/api-response.model';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string, params?: Record<string, any> | PageRequestParams): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams }).pipe(
      map(res => res.data)
    );
  }

  post<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, { params: httpParams }).pipe(
      map(res => res.data)
    );
  }

  put<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, { params: httpParams }).pipe(
      map(res => res.data)
    );
  }

  delete<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams }).pipe(
      map(res => res.data)
    );
  }

  upload<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, formData).pipe(
      map(res => res.data)
    );
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        httpParams = httpParams.set(key, val.toString());
      }
    });

    return httpParams;
  }
}
