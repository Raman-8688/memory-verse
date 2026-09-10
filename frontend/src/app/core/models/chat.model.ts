import { User } from './user.model';

export type ChatGroupRole = 'ADMIN' | 'MEMBER';
export type ChatMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessageReaction {
  id: string;
  user: User;
  reactionCode: string;
  createdAt: string;
}

export interface ReactionGroup {
  reactionCode: string;
  count: number;
  hasReacted: boolean;
  userNames: string[];
}

export interface ChatMessageReactionUpdatedPayload {
  messageId: string;
  reactions: ChatMessageReaction[];
}

export interface ChatMessageMention {
  id: string;
  messageId: string;
  mentionedUserId: string;
  mentionedUserName?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatGroupId: string;
  sender: User;
  messageType: ChatMessageType;
  textContent?: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  thumbnailUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaFormat?: string;
  mediaBytes?: number;
  mediaDuration?: number;
  originalFileName?: string;
  replyToMessage?: ChatMessage;
  clientMessageId?: string;
  edited: boolean;
  deleted: boolean;
  deletedAt?: string;
  reactions?: ChatMessageReaction[];
  mentions?: ChatMessageMention[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageViewModel extends ChatMessage {
  deliveryStatus?: MessageDeliveryStatus;
  localPreviewUrl?: string;
  uploadProgress?: number;
  failedFile?: File;
  attachmentType?: 'image' | 'video' | 'file';
}

export interface ChatGroupMember {
  id: string;
  user: User;
  role: ChatGroupRole;
  joinedAt: string;
  lastReadMessageId?: string;
  lastReadAt?: string;
}

export interface ChatGroupSummary {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy: User;
  memberCount: number;
  unreadCount: number;
  unreadMentionCount?: number;
  lastMessage?: ChatMessage;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatGroupDetail {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  createdBy: User;
  members: ChatGroupMember[];
  mediaCount?: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageSearchResult {
  id?: string;
  messageId: string;
  chatGroupId: string;
  senderId?: string;
  senderName: string;
  senderAvatarUrl?: string;
  sender?: User;
  messageType: ChatMessageType;
  textContent?: string;
  contentPreview?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  originalFileName?: string;
  createdAt: string;
  highlightText?: string;
}

export interface ChatMediaItem {
  id?: string;
  messageId: string;
  chatGroupId: string;
  senderId?: string;
  senderName: string;
  sender?: User;
  messageType?: ChatMessageType;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaBytes?: number;
  mediaDuration?: number;
  mediaFormat?: string;
  originalFileName?: string;
  caption?: string;
  createdAt: string;
}

export interface ChatGroupRoleUpdateDto {
  role: ChatGroupRole;
}

export interface ChatGroupCreateDto {
  name: string;
  description?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  memberUserIds?: string[];
}

export interface ChatGroupUpdateDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
}

export interface ChatMemberAddDto {
  userId: string;
  role?: ChatGroupRole;
}

export interface ChatMessageSendDto {
  chatGroupId: string;
  messageType?: ChatMessageType;
  textContent?: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  thumbnailUrl?: string;
  replyToMessageId?: string;
  clientMessageId?: string;
  mentionedUserIds?: string[];
}

export interface ChatMessageReactionToggleDto {
  reactionCode: string;
}

export interface ChatMessageUpdateDto {
  textContent: string;
}

export interface SignedDocumentUrlResponse {
  messageId: string;
  url: string;
  fileName: string;
  expiresAt: string;
}

