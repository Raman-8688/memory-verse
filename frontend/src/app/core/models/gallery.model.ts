import { MediaType } from './memory.model';
import { User } from './user.model';

export interface GalleryItem {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  fileName?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  displayOrder: number;
  memoryId?: string;
  memoryTitle?: string;
  memoryDate?: string;
  locationName?: string;
  journeyId?: string;
  journeyTitle?: string;
  sectionId?: string;
  sectionTitle?: string;
  uploader?: User;
  taggedUsers?: User[];
  createdAt: string;
}

export interface GalleryFilterParams {
  journeyId?: string;
  sectionId?: string;
  mediaType?: MediaType;
  taggedUserId?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
