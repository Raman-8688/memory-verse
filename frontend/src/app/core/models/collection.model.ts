import { User } from './user.model';

export interface Collection {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  memoryCount: number;
  createdBy: User;
  createdAt: string;
}

export interface CollectionCreateDto {
  title: string;
  description?: string;
  coverImageUrl?: string;
  initialMemoryIds?: string[];
}

export interface CollectionUpdateDto {
  title: string;
  description?: string;
  coverImageUrl?: string;
}
