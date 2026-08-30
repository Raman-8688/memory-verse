import { User } from './user.model';

export interface JourneySection {
  id: string;
  journeyId: string;
  title: string;
  description?: string;
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
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
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
