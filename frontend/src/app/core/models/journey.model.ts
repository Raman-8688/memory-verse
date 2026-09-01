import { User } from './user.model';

export interface JourneySection {
  id: string;
  journeyId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface Journey {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: User;
  sections: JourneySection[];
  memoryCount?: number;
  createdAt: string;
}

export interface JourneySectionCreateDto {
  title: string;
  description?: string;
  imageUrl?: string | null;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
}

export interface JourneySectionUpdateDto {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface JourneyCreateDto {
  title: string;
  description?: string;
  coverImageUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder?: number;
  sections?: JourneySectionCreateDto[];
}

export interface JourneyUpdateDto {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  displayOrder?: number;
}
