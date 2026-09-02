export type NotificationType = 
  | 'MEMORY_CREATED' 
  | 'MEMORY_UPDATED' 
  | 'MEDIA_ADDED' 
  | 'JOURNEY_UPDATED' 
  | 'CHAPTER_UPDATED' 
  | 'TAGGED' 
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
}
