import { Journey } from './journey.model';
import { Memory } from './memory.model';

export interface DashboardStats {
  totalMemories: number;
  totalPhotos: number;
  totalVideos: number;
  totalJourneys: number;
  totalFriends: number;
}

export interface TimelineMilestone {
  year: string;
  periodTitle: string;
  description?: string;
  coverImageUrl?: string;
  journeyId: string;
  sectionId?: string;
  milestoneDate?: string;
  memoryCount: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  memoryOfTheDay?: Memory;
  memoryOfTheDayContext?: string;
  timeline: TimelineMilestone[];
  recentMemories: Memory[];
  activeJourneys: Journey[];
}
