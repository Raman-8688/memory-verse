import { User } from './user.model';

export type MediaType = 'IMAGE' | 'VIDEO';

export interface Media {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  publicId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  displayOrder: number;
  createdAt: string;
}

export interface Memory {
  id: string;
  title: string;
  story: string;
  memoryDate: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  isFeatured: boolean;
  journeyId: string;
  journeyTitle?: string;
  sectionId?: string;
  sectionTitle?: string;
  createdBy: User;
  mediaList: Media[];
  taggedUsers: User[];
  createdAt: string;
}

export interface MemoryCreateDto {
  title: string;
  story: string;
  memoryDate: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  journeyId: string;
  sectionId?: string;
  taggedUserIds?: string[];
  isFeatured?: boolean;
  externalImageUrls?: string[];
}

export interface MemoryFilterParams {
  journeyId?: string;
  sectionId?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
