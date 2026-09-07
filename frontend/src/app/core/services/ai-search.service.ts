import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AiSearchFetchRequest,
  AiSearchQuery,
  AiSearchRecordsResponse,
  AiSearchSummaryResponse,
  MemorySearchFilter
} from '../models/ai-search.model';

@Injectable({
  providedIn: 'root'
})
export class AiSearchService {
  private readonly api = inject(ApiService);

  readonly activeFilters = signal<MemorySearchFilter | null>(null);
  readonly activeSearchToken = signal<string | null>(null);
  readonly lastSummary = signal<AiSearchSummaryResponse | null>(null);
  readonly isLoadingSummary = signal<boolean>(false);
  readonly isLoadingRecords = signal<boolean>(false);

  /**
   * Tier 1: Progressive Disclosure.
   * Extracts intent, recognizes relative dates, merges conversational context,
   * and returns lightweight metadata summary ONLY (zero media payload).
   */
  getSearchSummary(
    query: string,
    previousFilters?: MemorySearchFilter | null,
    contextToken?: string | null
  ): Observable<AiSearchSummaryResponse> {
    this.isLoadingSummary.set(true);

    const payload: { query: string; contextToken?: string; previousFilters?: MemorySearchFilter } = {
      query: query.trim()
    };

    const tokenToUse = contextToken || this.activeSearchToken();
    if (tokenToUse) {
      payload.contextToken = tokenToUse;
    }

    const filtersToUse = previousFilters || this.activeFilters();
    if (filtersToUse) {
      payload.previousFilters = filtersToUse;
    }

    return this.api.post<AiSearchSummaryResponse>('/ai/search/summary', payload).pipe(
      tap({
        next: (res) => {
          this.isLoadingSummary.set(false);
          this.lastSummary.set(res);
          this.activeSearchToken.set(res.searchToken);
          this.activeFilters.set(res.activeFilters);
        },
        error: () => {
          this.isLoadingSummary.set(false);
        }
      })
    );
  }

  /**
   * Tier 2: On-Demand Media & Memory Retrieval.
   * Loads memories or media gallery records strictly when an action chip is triggered.
   */
  fetchRecords(
    searchToken: string,
    fetchType: 'MEMORIES' | 'MEDIA',
    page = 0,
    size = 20
  ): Observable<AiSearchRecordsResponse> {
    this.isLoadingRecords.set(true);

    const payload: AiSearchFetchRequest = {
      searchToken,
      fetchType,
      page,
      size
    };

    return this.api.post<AiSearchRecordsResponse>('/ai/search/fetch-records', payload).pipe(
      tap({
        next: () => this.isLoadingRecords.set(false),
        error: () => this.isLoadingRecords.set(false)
      })
    );
  }

  clearContext(): void {
    this.activeFilters.set(null);
    this.activeSearchToken.set(null);
    this.lastSummary.set(null);
  }
}