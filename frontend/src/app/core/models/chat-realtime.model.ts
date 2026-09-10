export type ChatRealtimeEventType =
  | 'MESSAGE_CREATED'
  | 'MESSAGE_UPDATED'
  | 'MESSAGE_DELETED'
  | 'REACTION_UPDATED'
  | 'TYPING'
  | 'PRESENCE'
  | 'MESSAGE_READ'
  | 'GROUP_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_READ_ALL';

export interface ChatRealtimeEvent<T = any> {
  eventType: ChatRealtimeEventType;
  groupId: string;
  payload: T;
  timestamp: string;
}

export interface ChatMemberRoleChangedPayload {
  userId: string;
  role: string;
}

export interface ChatTypingPayload {
  groupId: string;
  userId: string;
  displayName: string;
  typing: boolean;
  timestamp: string;
}

export interface ChatPresencePayload {
  userId: string;
  displayName: string;
  status: 'ONLINE' | 'OFFLINE';
  timestamp: string;
}

export interface ChatMessageReadPayload {
  groupId: string;
  userId: string;
  lastReadMessageId: string;
  readAt: string;
}

export type RealtimeConnectionStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'DISCONNECTED';
