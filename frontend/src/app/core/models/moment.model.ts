import { User } from './user.model';

export type MomentMediaType = 'IMAGE' | 'VIDEO';

export interface MomentMedia {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: MomentMediaType;
  displayOrder: number;
  createdAt?: string;
}

export interface Moment {
  id: string;
  caption?: string;
  author: User;
  media: MomentMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface MomentUpdateDto {
  caption?: string;
}
