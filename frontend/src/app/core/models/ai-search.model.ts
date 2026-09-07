import { Memory } from './memory.model';
import { RelatedMedia } from './ai.model';

export interface MemorySearchFilter {
  dateStart?: string;
  dateEnd?: string;
  relativeDateDescription?: string;
  location?: string;
  personName?: string;
  taggedFriendNames?: string[];
  mediaType?: 'ALL' | 'IMAGE' | 'VIDEO';
  journeyId?: string;
  journeyName?: string;
  sectionId?: string;
  sectionName?: string;
  isFavorite?: boolean;
  keywords?: string[];
  rawQuery?: string;
}

export interface AiSearchQuery {
  query: string;
  contextToken?: string;
  previousFilters?: MemorySearchFilter;
}

export interface SearchActionChip {
  action: 'VIEW_PHOTOS' | 'VIEW_VIDEOS' | 'VIEW_MEMORIES' | 'FILTER_PERSON' | 'FILTER_LOCATION';
  label: string;
  value?: string;
  count?: number;
}

export interface AiSearchSummaryResponse {
  searchToken: string;
  activeFilters: MemorySearchFilter;
  matchingMemoryCount: number;
  totalImageCount: number;
  totalVideoCount: number;
  people: string[];
  locations: string[];
  conversationalSummary: string;
  suggestedActions: SearchActionChip[];
}

export interface AiSearchFetchRequest {
  searchToken: string;
  fetchType: 'MEMORIES' | 'MEDIA';
  page?: number;
  size?: number;
}

export interface AiSearchRecordsResponse {
  searchToken: string;
  fetchType: 'MEMORIES' | 'MEDIA';
  page: number;
  size: number;
  totalCount: number;
  hasMore: boolean;
  memories: Memory[];
  mediaItems: RelatedMedia[];
}
