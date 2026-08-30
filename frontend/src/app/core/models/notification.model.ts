export type NotificationType = 'MEMORY_CREATED' | 'TAGGED' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}
