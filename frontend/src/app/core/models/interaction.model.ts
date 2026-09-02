import { User } from './user.model';

export interface MemoryComment {
  id: string;
  memoryId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  userNames?: string[];
}
