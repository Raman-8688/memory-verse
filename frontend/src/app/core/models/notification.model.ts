export type NotificationType = 
  | 'MEMORY_CREATED' 
  | 'MEMORY_UPDATED' 
  | 'MEDIA_ADDED' 
  | 'JOURNEY_UPDATED' 
  | 'CHAPTER_UPDATED' 
  | 'TAGGED' 
  | 'NEW_TAG'
  | 'MEMORY_SHARED'
  | 'ON_THIS_DAY'
  | 'SYSTEM'
  | 'MENTION'
  | 'REPLY'
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_MEMBER_REMOVED'
  | 'GROUP_ROLE_CHANGED';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  title?: string;
  preview?: string;
  groupId?: string;
  groupName?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
  readAt?: string;
}
