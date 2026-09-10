import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChatService } from '@core/services/chat.service';
import { ChatRealtimeService } from '@core/services/chat-realtime.service';
import { AuthService } from '@core/auth/auth.service';
import {
  ChatGroupSummary,
  ChatGroupDetail,
  ChatGroupMember,
  ChatGroupRole,
  ChatMessage,
  ChatMessageType,
  ChatMessageViewModel,
  ChatMessageSendDto,
  ChatGroupCreateDto,
  ChatGroupUpdateDto,
  ChatMessageSearchResult,
  ChatMediaItem,
  ReactionGroup
} from '@core/models/chat.model';
import {
  ChatRealtimeEvent,
  ChatTypingPayload,
  ChatPresencePayload,
  ChatMessageReadPayload,
  ChatMemberRoleChangedPayload
} from '@core/models/chat-realtime.model';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';

@Component({
  selector: 'mv-group-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './group-chat.component.html',
  styleUrl: './group-chat.component.scss'
})
export class GroupChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('composerTextarea') private composerTextarea?: ElementRef<HTMLTextAreaElement>;

  private readonly chatService = inject(ChatService);
  private readonly realtimeService = inject(ChatRealtimeService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentUser = this.authService.currentUser;
  readonly connectionStatus = this.realtimeService.connectionStatus;

  // Allowed whitelist reactions
  readonly ALLOWED_REACTIONS: string[] = ['❤️', '😂', '🔥', '👍', '👏', '🥹', '😍', '😮', '🎉', '🙌'];

  // Groups list state
  readonly groups = signal<ChatGroupSummary[]>([]);
  readonly isGroupsLoading = signal<boolean>(true);
  readonly groupsError = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  private readonly searchSubject = new Subject<string>();

  // Active group state
  readonly activeGroupId = signal<string | null>(null);
  readonly activeGroupDetail = signal<ChatGroupDetail | null>(null);
  readonly activeGroupMembers = signal<ChatGroupMember[]>([]);
  readonly isActiveGroupLoading = signal<boolean>(false);
  readonly activeGroupError = signal<string | null>(null);

  // Messages state
  readonly messages = signal<ChatMessageViewModel[]>([]);
  readonly isMessagesLoading = signal<boolean>(false);
  readonly messagesError = signal<string | null>(null);

  // Phase 7 Interactive State Signals
  readonly replyingToMessage = signal<ChatMessageViewModel | null>(null);
  readonly editingMessage = signal<ChatMessageViewModel | null>(null);
  readonly confirmDeleteMessage = signal<ChatMessageViewModel | null>(null);
  readonly activeActionMenuMessageId = signal<string | null>(null);
  readonly activeReactionPickerMessageId = signal<string | null>(null);

  // Phase 8: Presence, Typing, Read receipts & Unread Signals
  readonly onlineMemberIds = signal<Set<string>>(new Set());
  readonly typingUsers = signal<Map<string, { name: string; timer: any }>>(new Map());
  readonly memberLastReads = signal<Map<string, { lastReadMessageId?: string; lastReadAt?: string }>>(new Map());
  readonly firstUnreadMessageId = signal<string | null>(null);

  private isCurrentUserTyping = false;
  private lastTypingSentAt = 0;
  private stopTypingTimer: any = null;

  // Computed Properties for Phase 8
  readonly onlineMemberCount = computed(() => {
    const online = this.onlineMemberIds();
    return this.activeGroupMembers().filter(m => m.user && online.has(m.user.id)).length;
  });

  readonly typingDisplayText = computed(() => {
    const currentUserId = this.currentUser()?.id;
    const users = Array.from(this.typingUsers().entries())
      .filter(([uid]) => uid !== currentUserId)
      .map(([, data]) => data.name);

    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users[0]}, ${users[1]} and ${users.length - 2} others are typing...`;
  });

  // UI Panels state
  readonly isInfoDrawerOpen = signal<boolean>(false);
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isCreatingGroup = signal<boolean>(false);

  // Phase 9: Message Search State Signals
  readonly isSearchOpen = signal<boolean>(false);
  readonly messageSearchQuery = signal<string>('');
  readonly searchResults = signal<ChatMessageSearchResult[]>([]);
  readonly isSearchingMessages = signal<boolean>(false);
  private readonly messageSearchSubject = new Subject<string>();

  // Phase 9 & 11: Shared Media Gallery, Files Drawer & Lightbox Navigation Signals
  readonly drawerActiveTab = signal<'members' | 'media' | 'files'>('members');
  readonly mediaGalleryItems = signal<ChatMediaItem[]>([]);
  readonly fileGalleryItems = signal<ChatMediaItem[]>([]);
  readonly isMediaLoading = signal<boolean>(false);
  readonly isFilesLoading = signal<boolean>(false);
  readonly activeViewerIndex = signal<number>(-1);
  readonly activeViewerGallery = signal<ChatMediaItem[]>([]);

  // Phase 9: Group Settings & Avatar Signals (Admin)
  readonly isSettingsModalOpen = signal<boolean>(false);
  readonly isUpdatingSettings = signal<boolean>(false);
  editGroupName = '';
  editGroupDescription = '';
  readonly selectedAvatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly isUploadingAvatar = signal<boolean>(false);

  // Phase 9: Member Management & Add Member Modal Signals
  readonly isAddMemberModalOpen = signal<boolean>(false);
  newMemberUserId = '';
  readonly isAddingMember = signal<boolean>(false);
  readonly confirmRemoveMember = signal<ChatGroupMember | null>(null);
  readonly isRemovingMember = signal<boolean>(false);

  // Phase 10: Mention Autocomplete & Deep Linking Signals
  readonly isMentionAutocompleteOpen = signal<boolean>(false);
  readonly mentionQuery = signal<string>('');
  readonly mentionSelectedIndex = signal<number>(0);
  readonly mentionCursorStart = signal<number>(-1);

  readonly mentionFilteredMembers = computed<ChatGroupMember[]>(() => {
    const members = this.activeGroupMembers();
    const query = this.mentionQuery().toLowerCase().trim();
    const currentUserId = this.currentUser()?.id;
    return members.filter(m => {
      if (!m.user || m.user.id === currentUserId) return false;
      if (!query) return true;
      const nameMatch = m.user.fullName && m.user.fullName.toLowerCase().includes(query);
      const emailMatch = m.user.email && m.user.email.toLowerCase().includes(query);
      return Boolean(nameMatch || emailMatch);
    });
  });

  // Phase 11: Multi-Type Attachment & Extended Lightbox State
  readonly selectedAttachmentFile = signal<File | null>(null);
  readonly selectedAttachmentType = signal<'image' | 'video' | 'file' | null>(null);
  readonly attachmentPreviewUrl = signal<string | null>(null);
  readonly attachmentAccept = signal<string>('image/jpeg,image/png,image/webp,image/gif');

  // Compatibility aliases for existing image templates/logic
  readonly selectedImageFile = this.selectedAttachmentFile;
  readonly imagePreviewUrl = this.attachmentPreviewUrl;

  readonly activeViewerItem = signal<{
    url: string;
    messageType?: ChatMessageType;
    caption?: string;
    senderName?: string;
    timestamp?: string;
    originalFileName?: string;
  } | null>(null);
  readonly activeViewerImage = this.activeViewerItem;

  // Create Group Form Model
  newGroupName = '';
  newGroupDescription = '';
  newGroupAvatarUrl = '';

  // Composer Model
  composerText = '';

  private readonly subscriptions = new Subscription();

  constructor() {
    // Debounced group search stream
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        this.fetchGroups(query);
      })
    );

    // Phase 9: Debounced message search stream
    this.subscriptions.add(
      this.messageSearchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        this.executeMessageSearch(query);
      })
    );

    // React to group creation/updates
    this.subscriptions.add(
      this.chatService.groupCreated$.subscribe(createdGroup => {
        this.fetchGroups();
        this.selectGroup(createdGroup.id);
      })
    );

    this.subscriptions.add(
      this.chatService.groupArchived$.subscribe(archivedId => {
        if (this.activeGroupId() === archivedId) {
          this.activeGroupId.set(null);
          this.activeGroupDetail.set(null);
          this.realtimeService.unsubscribeCurrentGroup();
        }
        this.fetchGroups();
      })
    );

    // Automatic message and presence recovery after socket reconnection
    this.subscriptions.add(
      this.realtimeService.reconnected$.subscribe(() => {
        const currentId = this.activeGroupId();
        if (currentId) {
          this.loadGroupPresence(currentId);
          this.recoverRecentMessages(currentId);
          this.markAsRead(currentId);
        }
        this.fetchGroups();
      })
    );

    // Background events (when another group receives a message while user is on current group)
    this.subscriptions.add(
      this.realtimeService.incomingEvent$.subscribe(event => {
        if (event.eventType === 'MESSAGE_CREATED') {
          const sMsg = event.payload;
          if (!sMsg) return;
          const currentId = this.activeGroupId();
          if (event.groupId !== currentId) {
            // Increment unread count for that group and update lastMessage
            this.groups.update(list => {
              const copy = list.map(g => {
                if (g.id === event.groupId) {
                  return {
                    ...g,
                    unreadCount: (g.unreadCount || 0) + 1,
                    lastMessage: sMsg,
                    updatedAt: sMsg.createdAt || new Date().toISOString()
                  };
                }
                return g;
              });
              return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
          }
        }
      })
    );
  }

  ngOnInit(): void {
    this.fetchGroups();

    // Listen to route params for direct /group-chat/:groupId navigation
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('groupId');
        if (id && id !== this.activeGroupId()) {
          this.loadGroup(id);
        } else if (!id) {
          this.realtimeService.unsubscribeCurrentGroup();
          this.activeGroupId.set(null);
          this.activeGroupDetail.set(null);
          this.messages.set([]);
        }
      })
    );

    // Listen to query params for direct message deep-linking (from notifications/search)
    this.subscriptions.add(
      this.route.queryParamMap.subscribe(params => {
        const messageId = params.get('messageId');
        if (messageId) {
          setTimeout(() => {
            this.scrollToMessage(messageId);
          }, 350);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.triggerTyping(false);
    this.clearAllTypingTimers();
    this.realtimeService.unsubscribeCurrentGroup();
    this.subscriptions.unsubscribe();
  }

  private clearAllTypingTimers(): void {
    this.typingUsers().forEach(data => {
      if (data.timer) {
        clearTimeout(data.timer);
      }
    });
    if (this.stopTypingTimer) {
      clearTimeout(this.stopTypingTimer);
      this.stopTypingTimer = null;
    }
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.fetchGroups();
  }

  fetchGroups(query?: string): void {
    this.isGroupsLoading.set(true);
    this.groupsError.set(null);

    this.chatService.getUserGroups(query, 0, 50).subscribe({
      next: res => {
        const groupList = res?.content || [];
        this.groups.set(groupList);
        this.isGroupsLoading.set(false);
      },
      error: () => {
        this.groupsError.set('Unable to load discussion groups.');
        this.isGroupsLoading.set(false);
      }
    });
  }

  selectGroup(groupId: string): void {
    if (this.activeGroupId() === groupId) return;
    this.router.navigate(['/group-chat', groupId]);
  }

  navigateBackToList(): void {
    this.router.navigate(['/group-chat']);
  }

  loadGroup(groupId: string): void {
    this.triggerTyping(false);
    this.clearAllTypingTimers();
    this.typingUsers.set(new Map());
    this.firstUnreadMessageId.set(null);

    this.activeGroupId.set(groupId);
    this.isActiveGroupLoading.set(true);
    this.activeGroupError.set(null);
    this.messages.set([]);
    this.replyingToMessage.set(null);
    this.editingMessage.set(null);
    this.confirmDeleteMessage.set(null);
    this.activeActionMenuMessageId.set(null);
    this.activeReactionPickerMessageId.set(null);
    this.cancelImageSelection();
    this.composerText = '';

    // Subscribe to group STOMP destination
    this.realtimeService.subscribeToGroup(groupId, event => {
      this.handleRealtimeEvent(groupId, event);
    });

    // 1. Fetch Group Details
    this.chatService.getGroupDetail(groupId).subscribe({
      next: detail => {
        this.activeGroupDetail.set(detail);
        this.isActiveGroupLoading.set(false);
        this.loadGroupPresence(groupId);
        this.loadGroupMembers(groupId);
        this.loadMessages(groupId);
        this.markAsRead(groupId);
      },
      error: err => {
        if (err?.status === 403) {
          this.activeGroupError.set("You don't have access to this discussion group.");
        } else if (err?.status === 404) {
          this.activeGroupError.set("Discussion group not found.");
        } else {
          this.activeGroupError.set("Could not load group details.");
        }
        this.isActiveGroupLoading.set(false);
      }
    });
  }

  loadGroupPresence(groupId: string): void {
    this.chatService.getGroupPresence(groupId).subscribe({
      next: onlineIds => {
        this.onlineMemberIds.set(new Set(onlineIds || []));
      },
      error: () => {}
    });
  }

  isMemberOnline(userId?: string): boolean {
    if (!userId) return false;
    return this.onlineMemberIds().has(userId);
  }

  private handleRealtimeEvent(groupId: string, event: ChatRealtimeEvent<any>): void {
    if (this.activeGroupId() !== groupId) return;

    if (event.eventType === 'MESSAGE_CREATED') {
      const serverMsg = event.payload;
      if (!serverMsg) return;

      this.messages.update(current => {
        const existingIdx = current.findIndex(m =>
          (serverMsg.clientMessageId && m.clientMessageId === serverMsg.clientMessageId) ||
          (m.id === serverMsg.id) ||
          (serverMsg.clientMessageId && m.id === serverMsg.clientMessageId)
        );

        if (existingIdx >= 0) {
          // Reconcile optimistic or existing message with authoritative server data
          const copy = [...current];
          copy[existingIdx] = {
            ...serverMsg,
            deliveryStatus: 'sent'
          };
          return copy;
        } else {
          // Incoming message from another user / session
          const updated = [
            ...current,
            {
              ...serverMsg,
              deliveryStatus: 'sent' as const
            }
          ];
          return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      });

      this.updateGroupLastMessage(groupId, serverMsg);
      this.scrollToBottom();

      // Automatically mark incoming active message as read
      this.markAsRead(groupId, serverMsg.id);
    } else if (event.eventType === 'MESSAGE_UPDATED') {
      const updatedMsg = event.payload;
      if (!updatedMsg) return;
      this.messages.update(current =>
        current.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg, deliveryStatus: 'sent' } : m)
      );
    } else if (event.eventType === 'MESSAGE_DELETED') {
      const deletedMessageId = (event.payload as any)?.id || event.payload;
      if (!deletedMessageId) return;
      this.messages.update(current =>
        current.map(m => m.id === (deletedMessageId as any)
          ? { ...m, deleted: true, textContent: 'This message was deleted', mediaUrl: undefined, localPreviewUrl: undefined, reactions: [] }
          : m
        )
      );
    } else if (event.eventType === 'REACTION_UPDATED') {
      const reactionPayload = event.payload;
      if (!reactionPayload || !reactionPayload.messageId) return;
      this.messages.update(current =>
        current.map(m => m.id === reactionPayload.messageId
          ? { ...m, reactions: reactionPayload.reactions || [] }
          : m
        )
      );
    } else if (event.eventType === 'TYPING') {
      const payload: ChatTypingPayload = event.payload;
      if (!payload || !payload.userId) return;
      if (payload.userId === this.currentUser()?.id) return;

      this.typingUsers.update(current => {
        const copy = new Map(current);
        const existing = copy.get(payload.userId);
        if (existing && existing.timer) {
          clearTimeout(existing.timer);
        }

        if (payload.typing) {
          const timer = setTimeout(() => {
            this.typingUsers.update(m => {
              const next = new Map(m);
              next.delete(payload.userId);
              return next;
            });
          }, 4500);
          copy.set(payload.userId, { name: payload.displayName || 'Someone', timer });
        } else {
          copy.delete(payload.userId);
        }
        return copy;
      });
    } else if (event.eventType === 'PRESENCE') {
      const payload: ChatPresencePayload = event.payload;
      if (!payload || !payload.userId) return;

      if (payload.status === 'ONLINE') {
        this.onlineMemberIds.update(set => {
          const next = new Set(set);
          next.add(payload.userId);
          return next;
        });
      } else {
        this.onlineMemberIds.update(set => {
          const next = new Set(set);
          next.delete(payload.userId);
          return next;
        });
      }
    } else if (event.eventType === 'MESSAGE_READ') {
      const payload: ChatMessageReadPayload = event.payload;
      if (!payload || !payload.userId) return;

      this.memberLastReads.update(current => {
        const copy = new Map(current);
        copy.set(payload.userId, {
          lastReadMessageId: payload.lastReadMessageId,
          lastReadAt: payload.readAt
        });
        return copy;
      });
    } else if (event.eventType === 'GROUP_UPDATED') {
      const updatedGroup: ChatGroupDetail = event.payload;
      if (!updatedGroup) return;
      if (this.activeGroupId() === groupId) {
        this.activeGroupDetail.set(updatedGroup);
      }
      this.groups.update(list =>
        list.map(g => g.id === groupId ? { ...g, name: updatedGroup.name, description: updatedGroup.description, avatarUrl: updatedGroup.avatarUrl } : g)
      );
    } else if (event.eventType === 'MEMBER_ADDED') {
      const newMember: ChatGroupMember = event.payload;
      if (!newMember || !newMember.user) return;
      if (this.activeGroupId() === groupId) {
        this.activeGroupMembers.update(members => {
          if (members.some(m => m.user?.id === newMember.user.id)) return members;
          return [...members, newMember];
        });
      }
      this.groups.update(list =>
        list.map(g => g.id === groupId ? { ...g, memberCount: g.memberCount + 1 } : g)
      );
    } else if (event.eventType === 'MEMBER_REMOVED') {
      const removedUserId: string = event.payload;
      if (!removedUserId) return;
      if (this.currentUser()?.id === removedUserId && this.activeGroupId() === groupId) {
        this.snackBar.open('You have been removed from this discussion group', 'Dismiss', { duration: 4000 });
        this.activeGroupId.set(null);
        this.activeGroupDetail.set(null);
        this.realtimeService.unsubscribeCurrentGroup();
        this.router.navigate(['/group-chat']);
        this.fetchGroups();
        return;
      }
      if (this.activeGroupId() === groupId) {
        this.activeGroupMembers.update(members => members.filter(m => m.user?.id !== removedUserId));
      }
      this.groups.update(list =>
        list.map(g => g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g)
      );
    } else if (event.eventType === 'MEMBER_ROLE_CHANGED') {
      const payload: ChatMemberRoleChangedPayload = event.payload;
      if (!payload || !payload.userId) return;
      if (this.activeGroupId() === groupId) {
        this.activeGroupMembers.update(members =>
          members.map(m => m.user?.id === payload.userId ? { ...m, role: payload.role as ChatGroupRole } : m)
        );
      }
    }
  }

  private recoverRecentMessages(groupId: string): void {
    this.chatService.getGroupMessages(groupId, 0, 30).subscribe({
      next: res => {
        if (this.activeGroupId() !== groupId) return;
        const serverMessages = res?.content || [];
        this.messages.update(current => {
          const currentMap = new Map<string, ChatMessageViewModel>();
          current.forEach(m => {
            currentMap.set(m.id, m);
            if (m.clientMessageId) {
              currentMap.set(m.clientMessageId, m);
            }
          });

          const merged: ChatMessageViewModel[] = [...current];
          serverMessages.forEach(sMsg => {
            const hasExisting = currentMap.has(sMsg.id) || (sMsg.clientMessageId && currentMap.has(sMsg.clientMessageId));
            if (!hasExisting) {
              merged.push({
                ...sMsg,
                deliveryStatus: 'sent'
              });
            }
          });

          return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      },
      error: () => {}
    });
  }

  loadGroupMembers(groupId: string): void {
    this.chatService.getGroupMembers(groupId).subscribe({
      next: members => {
        this.activeGroupMembers.set(members || []);
        // Populate member last reads map
        const reads = new Map<string, { lastReadMessageId?: string; lastReadAt?: string }>();
        members.forEach(m => {
          if (m.user) {
            reads.set(m.user.id, {
              lastReadMessageId: m.lastReadMessageId,
              lastReadAt: m.lastReadAt
            });
          }
        });
        this.memberLastReads.set(reads);
      },
      error: () => {}
    });
  }

  loadMessages(groupId: string): void {
    this.isMessagesLoading.set(true);
    this.messagesError.set(null);

    const targetGroup = this.groups().find(g => g.id === groupId);
    const unreadCount = targetGroup?.unreadCount || 0;

    this.chatService.getGroupMessages(groupId, 0, 50).subscribe({
      next: res => {
        // Backend returns newest first; reverse for natural top-to-bottom chat flow
        const content = res?.content || [];
        const chronological: ChatMessageViewModel[] = [...content].reverse().map(m => ({
          ...m,
          deliveryStatus: 'sent'
        }));
        this.messages.set(chronological);

        if (unreadCount > 0 && chronological.length > 0) {
          const startIndex = Math.max(0, chronological.length - unreadCount);
          this.firstUnreadMessageId.set(chronological[startIndex]?.id || null);
        } else {
          this.firstUnreadMessageId.set(null);
        }

        this.isMessagesLoading.set(false);
        this.scrollToBottom(true);
      },
      error: () => {
        this.messagesError.set("Could not load message history.");
        this.isMessagesLoading.set(false);
      }
    });
  }

  markAsRead(groupId: string, lastReadMessageId?: string): void {
    this.chatService.markMessagesAsRead(groupId, lastReadMessageId).subscribe({
      next: () => {
        // Update unread count in local list
        this.groups.update(list =>
          list.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g)
        );
      },
      error: () => {}
    });
  }

  // --- Typing Indicator Triggers ---

  triggerTyping(isTyping: boolean): void {
    const groupId = this.activeGroupId();
    if (!groupId) return;

    if (isTyping) {
      if (this.stopTypingTimer) {
        clearTimeout(this.stopTypingTimer);
      }
      const now = Date.now();
      if (!this.isCurrentUserTyping || (now - this.lastTypingSentAt > 2500)) {
        this.realtimeService.sendTyping(groupId, true);
        this.isCurrentUserTyping = true;
        this.lastTypingSentAt = now;
      }
      this.stopTypingTimer = setTimeout(() => {
        this.triggerTyping(false);
      }, 3500);
    } else {
      if (this.stopTypingTimer) {
        clearTimeout(this.stopTypingTimer);
        this.stopTypingTimer = null;
      }
      if (this.isCurrentUserTyping) {
        this.realtimeService.sendTyping(groupId, false);
        this.isCurrentUserTyping = false;
        this.lastTypingSentAt = 0;
      }
    }
  }

  // --- Message Read & Delivery States ---
  getMessageDeliveryStatus(message: ChatMessageViewModel): 'sending' | 'failed' | 'sent' | 'read' | null {
    const user = this.currentUser();
    if (!user || message.sender?.id !== user.id) {
      return null;
    }

    if (message.deliveryStatus === 'sending') {
      return 'sending';
    }
    if (message.deliveryStatus === 'failed') {
      return 'failed';
    }

    // Check if any other member has read up to this message
    const msgCreatedAt = new Date(message.createdAt).getTime();
    const reads = this.memberLastReads();

    for (const [userId, readData] of reads.entries()) {
      if (userId !== user.id) {
        if (readData.lastReadMessageId && readData.lastReadMessageId === message.id) {
          return 'read';
        }
        if (readData.lastReadAt && new Date(readData.lastReadAt).getTime() >= msgCreatedAt) {
          return 'read';
        }
      }
    }

    return 'sent';
  }

  // --- Phase 11: Multi-Type Attachment & Picker Handlers ---
  triggerFileInput(): void {
    this.triggerPhotoPicker();
  }

  triggerPhotoPicker(): void {
    this.selectedAttachmentType.set('image');
    this.attachmentAccept.set('image/jpeg,image/png,image/webp,image/gif');
    setTimeout(() => this.fileInput?.nativeElement?.click(), 0);
  }

  triggerVideoPicker(): void {
    this.selectedAttachmentType.set('video');
    this.attachmentAccept.set('video/mp4,video/webm,video/quicktime');
    setTimeout(() => this.fileInput?.nativeElement?.click(), 0);
  }

  triggerDocumentPicker(): void {
    this.selectedAttachmentType.set('file');
    this.attachmentAccept.set('.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.json,.rtf,.md');
    setTimeout(() => this.fileInput?.nativeElement?.click(), 0);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const detectedType = this.detectAttachmentType(file);
    const fileName = file.name || 'attachment';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Check executable blacklist
    const dangerousExts = ['exe', 'bat', 'cmd', 'sh', 'apk', 'jar', 'dll', 'msi', 'vbs', 'js', 'jsp', 'php', 'bin', 'com', 'scr', 'ps1'];
    if (dangerousExts.includes(extension)) {
      this.snackBar.open('Executable and script files (.exe, .sh, etc.) are strictly prohibited', 'Dismiss', { duration: 4000 });
      input.value = '';
      return;
    }

    if (detectedType === 'image') {
      const maxSizeBytes = 15 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.snackBar.open('Image exceeds maximum allowed size of 15MB', 'Dismiss', { duration: 3500 });
        input.value = '';
        return;
      }
      if (this.attachmentPreviewUrl()) {
        URL.revokeObjectURL(this.attachmentPreviewUrl()!);
      }
      const previewUrl = URL.createObjectURL(file);
      this.selectedAttachmentType.set('image');
      this.selectedAttachmentFile.set(file);
      this.attachmentPreviewUrl.set(previewUrl);
    } else if (detectedType === 'video') {
      const maxSizeBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.snackBar.open('Video exceeds maximum allowed size of 50MB', 'Dismiss', { duration: 3500 });
        input.value = '';
        return;
      }
      if (this.attachmentPreviewUrl()) {
        URL.revokeObjectURL(this.attachmentPreviewUrl()!);
      }
      const previewUrl = URL.createObjectURL(file);
      this.selectedAttachmentType.set('video');
      this.selectedAttachmentFile.set(file);
      this.attachmentPreviewUrl.set(previewUrl);
    } else {
      // Document / generic file
      const maxSizeBytes = 20 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.snackBar.open('File exceeds maximum allowed size of 20MB', 'Dismiss', { duration: 3500 });
        input.value = '';
        return;
      }
      if (this.attachmentPreviewUrl()) {
        URL.revokeObjectURL(this.attachmentPreviewUrl()!);
      }
      this.selectedAttachmentType.set('file');
      this.selectedAttachmentFile.set(file);
      this.attachmentPreviewUrl.set(null);
    }
  }

  cancelAttachmentSelection(): void {
    if (this.attachmentPreviewUrl()) {
      URL.revokeObjectURL(this.attachmentPreviewUrl()!);
    }
    this.attachmentPreviewUrl.set(null);
    this.selectedAttachmentFile.set(null);
    this.selectedAttachmentType.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  cancelImageSelection(): void {
    this.cancelAttachmentSelection();
  }

  private detectAttachmentType(file: File): 'image' | 'video' | 'file' {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv)$/i)) return 'video';
    return 'file';
  }

  // --- Send Message & Optimistic UI ---
  onComposerInput(event?: Event): void {
    this.triggerTyping(true);

    const textarea = this.composerTextarea?.nativeElement;
    if (!textarea) return;

    const text = this.composerText;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);

    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);
    if (atMatch) {
      const query = atMatch[1];
      if (!query.includes('\n') && query.length < 30) {
        this.mentionQuery.set(query);
        this.mentionCursorStart.set(cursorPos - query.length - 1);
        this.isMentionAutocompleteOpen.set(true);
        this.mentionSelectedIndex.set(0);
        return;
      }
    }
    this.closeMentionAutocomplete();
  }

  onComposerKeyDown(event: KeyboardEvent): void {
    if (this.isMentionAutocompleteOpen()) {
      const filtered = this.mentionFilteredMembers();
      if (filtered.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.mentionSelectedIndex.update(i => (i + 1) % filtered.length);
          return;
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.mentionSelectedIndex.update(i => (i - 1 + filtered.length) % filtered.length);
          return;
        } else if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const target = filtered[this.mentionSelectedIndex()];
          if (target) {
            this.selectMention(target);
          }
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeMentionAutocomplete();
        return;
      }
    }

    if (this.editingMessage()) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.saveEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelEdit();
      }
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else if (event.key === 'Escape' && this.replyingToMessage()) {
      event.preventDefault();
      this.cancelReply();
    }
  }

  selectMention(member: ChatGroupMember): void {
    if (!member || !member.user) return;
    const textarea = this.composerTextarea?.nativeElement;
    const currentText = this.composerText;
    const start = this.mentionCursorStart();
    const end = textarea ? textarea.selectionStart : currentText.length;
    const mentionName = member.user.fullName || 'User';
    const insertText = `@${mentionName} `;

    if (start >= 0) {
      this.composerText = currentText.substring(0, start) + insertText + currentText.substring(end);
    } else {
      this.composerText += insertText;
    }

    this.closeMentionAutocomplete();
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursor = (start >= 0 ? start : currentText.length) + insertText.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }

  closeMentionAutocomplete(): void {
    this.isMentionAutocompleteOpen.set(false);
    this.mentionQuery.set('');
    this.mentionSelectedIndex.set(0);
    this.mentionCursorStart.set(-1);
  }

  formatMessageWithMentions(text?: string): { text: string; isMention: boolean; isSelf: boolean }[] {
    if (!text) return [];
    const currentUserName = this.currentUser()?.fullName?.toLowerCase();
    const parts: { text: string; isMention: boolean; isSelf: boolean }[] = [];
    const regex = /(@[a-zA-Z0-9_\s]{2,30}?)(?=[.,!?;:\s]|$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isMention: false, isSelf: false });
      }
      const mentionTag = match[1];
      const isSelf = Boolean(currentUserName && mentionTag.toLowerCase().includes(currentUserName));
      parts.push({ text: mentionTag, isMention: true, isSelf });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isMention: false, isSelf: false });
    }
    return parts.length > 0 ? parts : [{ text, isMention: false, isSelf: false }];
  }

  isCurrentUserMentioned(message: ChatMessage): boolean {
    const currentUserId = this.currentUser()?.id;
    if (!currentUserId || !message) return false;
    if (message.mentions && message.mentions.some(m => m.mentionedUserId === currentUserId)) {
      return true;
    }
    const currentUserName = this.currentUser()?.fullName?.toLowerCase();
    if (currentUserName && message.textContent && message.textContent.toLowerCase().includes('@' + currentUserName)) {
      return true;
    }
    return false;
  }

  sendMessage(): void {
    if (this.editingMessage()) {
      this.saveEdit();
      return;
    }

    this.triggerTyping(false);

    const selectedFile = this.selectedAttachmentFile();
    const attachmentType = this.selectedAttachmentType();
    const text = this.composerText.trim();
    const replyTarget = this.replyingToMessage();

    // If an attachment is selected, route through appropriate upload handler
    if (selectedFile) {
      const preview = this.attachmentPreviewUrl();
      if (attachmentType === 'video') {
        this.sendVideoMessage(selectedFile, text, preview, undefined, replyTarget?.id);
      } else if (attachmentType === 'file') {
        this.sendFileMessage(selectedFile, text, undefined, replyTarget?.id);
      } else {
        this.sendImageMessage(selectedFile, text, preview, undefined, replyTarget?.id);
      }
      this.cancelAttachmentSelection();
      this.cancelReply();
      this.composerText = '';
      return;
    }

    if (!text) return;
    if (text.length > 4000) {
      this.snackBar.open('Message cannot exceed 4000 characters', 'Dismiss', { duration: 3000 });
      return;
    }

    const groupId = this.activeGroupId();
    const user = this.currentUser();
    if (!groupId || !user) return;

    // 1. Generate unique clientMessageId
    const clientMessageId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : ('msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

    // 2. Create optimistic message
    const now = new Date().toISOString();
    const optimisticMsg: ChatMessageViewModel = {
      id: clientMessageId,
      chatGroupId: groupId,
      sender: user,
      messageType: 'TEXT',
      textContent: text,
      replyToMessage: replyTarget ? { ...replyTarget } : undefined,
      clientMessageId: clientMessageId,
      edited: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: 'sending'
    };

    // 3. Immediately update UI state, clear composer input & clear reply preview
    this.messages.update(current => [...current, optimisticMsg]);
    this.composerText = '';
    this.cancelReply();
    this.scrollToBottom(true);

    // Optimistically update sidebar preview
    this.updateGroupLastMessage(groupId, optimisticMsg);

    // 4. Send request to backend
    const sendDto: ChatMessageSendDto = {
      chatGroupId: groupId,
      messageType: 'TEXT',
      textContent: text,
      replyToMessageId: replyTarget ? replyTarget.id : undefined,
      clientMessageId: clientMessageId
    };

    this.chatService.sendMessage(groupId, sendDto).subscribe({
      next: (serverMsg) => {
        // Reconcile optimistic message with server message if still on same group
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...serverMsg, deliveryStatus: 'sent' }
                : m
            )
          );
        }
        this.updateGroupLastMessage(groupId, serverMsg);
      },
      error: (err) => {
        // Mark optimistic message as failed
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, deliveryStatus: 'failed' }
                : m
            )
          );
        }
        const errMsg = err?.error?.message || 'Failed to send message';
        this.snackBar.open(errMsg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  private sendImageMessage(
    file: File,
    caption: string,
    localPreview: string | null,
    existingClientMessageId?: string,
    replyToMessageId?: string
  ): void {
    const groupId = this.activeGroupId();
    const user = this.currentUser();
    if (!groupId || !user) return;

    this.triggerTyping(false);

    const replyTarget = this.replyingToMessage();
    const targetReplyId = replyToMessageId || replyTarget?.id;

    const clientMessageId = existingClientMessageId || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : ('img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)));

    const now = new Date().toISOString();
    const optimisticMsg: ChatMessageViewModel = {
      id: clientMessageId,
      chatGroupId: groupId,
      sender: user,
      messageType: 'IMAGE',
      textContent: caption || undefined,
      localPreviewUrl: localPreview || undefined,
      replyToMessage: replyTarget ? { ...replyTarget } : undefined,
      clientMessageId: clientMessageId,
      edited: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: 'sending',
      uploadProgress: 0,
      failedFile: file,
      attachmentType: 'image'
    };

    this.messages.update(current => {
      const idx = current.findIndex(m => m.clientMessageId === clientMessageId || m.id === clientMessageId);
      if (idx >= 0) {
        const copy = [...current];
        copy[idx] = optimisticMsg;
        return copy;
      }
      return [...current, optimisticMsg];
    });

    this.cancelReply();
    this.scrollToBottom(true);
    this.updateGroupLastMessage(groupId, optimisticMsg);

    this.chatService.uploadImageMessage(groupId, file, caption, clientMessageId, targetReplyId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, uploadProgress: progress }
                : m
            )
          );
        } else if (event.type === HttpEventType.Response) {
          const serverMsg = event.body?.data;
          if (serverMsg && this.activeGroupId() === groupId) {
            this.messages.update(current =>
              current.map(m =>
                (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                  ? { ...serverMsg, deliveryStatus: 'sent', uploadProgress: 100 }
                  : m
              )
            );
            this.updateGroupLastMessage(groupId, serverMsg);
          }
        }
      },
      error: err => {
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, deliveryStatus: 'failed', failedFile: file }
                : m
            )
          );
        }
        const msg = err?.error?.message || 'Failed to upload image. Please retry.';
        this.snackBar.open(msg, 'Dismiss', { duration: 3500 });
      }
    });
  }

  private sendVideoMessage(
    file: File,
    caption: string,
    localPreview: string | null,
    existingClientMessageId?: string,
    replyToMessageId?: string
  ): void {
    const groupId = this.activeGroupId();
    const user = this.currentUser();
    if (!groupId || !user) return;

    this.triggerTyping(false);

    const replyTarget = this.replyingToMessage();
    const targetReplyId = replyToMessageId || replyTarget?.id;

    const clientMessageId = existingClientMessageId || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : ('vid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)));

    const now = new Date().toISOString();
    const optimisticMsg: ChatMessageViewModel = {
      id: clientMessageId,
      chatGroupId: groupId,
      sender: user,
      messageType: 'VIDEO',
      textContent: caption || undefined,
      localPreviewUrl: localPreview || undefined,
      originalFileName: file.name,
      replyToMessage: replyTarget ? { ...replyTarget } : undefined,
      clientMessageId: clientMessageId,
      edited: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: 'sending',
      uploadProgress: 0,
      failedFile: file,
      attachmentType: 'video'
    };

    this.messages.update(current => {
      const idx = current.findIndex(m => m.clientMessageId === clientMessageId || m.id === clientMessageId);
      if (idx >= 0) {
        const copy = [...current];
        copy[idx] = optimisticMsg;
        return copy;
      }
      return [...current, optimisticMsg];
    });

    this.cancelReply();
    this.scrollToBottom(true);
    this.updateGroupLastMessage(groupId, optimisticMsg);

    this.chatService.uploadVideoMessage(groupId, file, caption, clientMessageId, targetReplyId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, uploadProgress: progress }
                : m
            )
          );
        } else if (event.type === HttpEventType.Response) {
          const serverMsg = event.body?.data;
          if (serverMsg && this.activeGroupId() === groupId) {
            this.messages.update(current =>
              current.map(m =>
                (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                  ? { ...serverMsg, deliveryStatus: 'sent', uploadProgress: 100 }
                  : m
              )
            );
            this.updateGroupLastMessage(groupId, serverMsg);
          }
        }
      },
      error: err => {
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, deliveryStatus: 'failed', failedFile: file }
                : m
            )
          );
        }
        const msg = err?.error?.message || 'Failed to upload video. Please retry.';
        this.snackBar.open(msg, 'Dismiss', { duration: 3500 });
      }
    });
  }

  private sendFileMessage(
    file: File,
    caption: string,
    existingClientMessageId?: string,
    replyToMessageId?: string
  ): void {
    const groupId = this.activeGroupId();
    const user = this.currentUser();
    if (!groupId || !user) return;

    this.triggerTyping(false);

    const replyTarget = this.replyingToMessage();
    const targetReplyId = replyToMessageId || replyTarget?.id;

    const clientMessageId = existingClientMessageId || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : ('file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)));

    const now = new Date().toISOString();
    const optimisticMsg: ChatMessageViewModel = {
      id: clientMessageId,
      chatGroupId: groupId,
      sender: user,
      messageType: 'FILE',
      textContent: caption || undefined,
      originalFileName: file.name,
      mediaBytes: file.size,
      mediaFormat: file.name.split('.').pop()?.toLowerCase(),
      replyToMessage: replyTarget ? { ...replyTarget } : undefined,
      clientMessageId: clientMessageId,
      edited: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: 'sending',
      uploadProgress: 0,
      failedFile: file,
      attachmentType: 'file'
    };

    this.messages.update(current => {
      const idx = current.findIndex(m => m.clientMessageId === clientMessageId || m.id === clientMessageId);
      if (idx >= 0) {
        const copy = [...current];
        copy[idx] = optimisticMsg;
        return copy;
      }
      return [...current, optimisticMsg];
    });

    this.cancelReply();
    this.scrollToBottom(true);
    this.updateGroupLastMessage(groupId, optimisticMsg);

    this.chatService.uploadFileMessage(groupId, file, caption, clientMessageId, targetReplyId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, uploadProgress: progress }
                : m
            )
          );
        } else if (event.type === HttpEventType.Response) {
          const serverMsg = event.body?.data;
          if (serverMsg && this.activeGroupId() === groupId) {
            this.messages.update(current =>
              current.map(m =>
                (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                  ? { ...serverMsg, deliveryStatus: 'sent', uploadProgress: 100 }
                  : m
              )
            );
            this.updateGroupLastMessage(groupId, serverMsg);
          }
        }
      },
      error: err => {
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, deliveryStatus: 'failed', failedFile: file }
                : m
            )
          );
        }
        const msg = err?.error?.message || 'Failed to upload document. Please retry.';
        this.snackBar.open(msg, 'Dismiss', { duration: 3500 });
      }
    });
  }

  retryMessage(failedMsg: ChatMessageViewModel): void {
    if (failedMsg.deliveryStatus !== 'failed') return;

    const groupId = failedMsg.chatGroupId;
    const clientMessageId = failedMsg.clientMessageId || failedMsg.id;

    // Handle failed attachment retries
    if (failedMsg.messageType === 'IMAGE' && failedMsg.failedFile) {
      this.sendImageMessage(
        failedMsg.failedFile,
        failedMsg.textContent || '',
        failedMsg.localPreviewUrl || null,
        clientMessageId,
        failedMsg.replyToMessage?.id
      );
      return;
    } else if (failedMsg.messageType === 'VIDEO' && failedMsg.failedFile) {
      this.sendVideoMessage(
        failedMsg.failedFile,
        failedMsg.textContent || '',
        failedMsg.localPreviewUrl || null,
        clientMessageId,
        failedMsg.replyToMessage?.id
      );
      return;
    } else if (failedMsg.messageType === 'FILE' && failedMsg.failedFile) {
      this.sendFileMessage(
        failedMsg.failedFile,
        failedMsg.textContent || '',
        clientMessageId,
        failedMsg.replyToMessage?.id
      );
      return;
    }

    // Set deliveryStatus back to sending
    this.messages.update(current =>
      current.map(m =>
        (m.clientMessageId === clientMessageId || m.id === clientMessageId)
          ? { ...m, deliveryStatus: 'sending' }
          : m
      )
    );

    const sendDto: ChatMessageSendDto = {
      chatGroupId: groupId,
      messageType: failedMsg.messageType || 'TEXT',
      textContent: failedMsg.textContent,
      replyToMessageId: failedMsg.replyToMessage?.id,
      clientMessageId: clientMessageId
    };

    this.chatService.sendMessage(groupId, sendDto).subscribe({
      next: (serverMsg) => {
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...serverMsg, deliveryStatus: 'sent' }
                : m
            )
          );
        }
        this.updateGroupLastMessage(groupId, serverMsg);
      },
      error: (err) => {
        if (this.activeGroupId() === groupId) {
          this.messages.update(current =>
            current.map(m =>
              (m.clientMessageId === clientMessageId || m.id === clientMessageId)
                ? { ...m, deliveryStatus: 'failed' }
                : m
            )
          );
        }
        const errMsg = err?.error?.message || 'Retry failed. Please check your connection.';
        this.snackBar.open(errMsg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  // --- Phase 7: Permission & Role Checks ---
  isCurrentUserAdmin(): boolean {
    const userId = this.currentUser()?.id;
    if (!userId) return false;
    return this.activeGroupMembers().some(m => m.user?.id === userId && m.role === 'ADMIN');
  }

  canEditMessage(msg: ChatMessageViewModel): boolean {
    return !msg.deleted && this.isOwnMessage(msg) && msg.messageType === 'TEXT' && msg.deliveryStatus === 'sent';
  }

  canDeleteMessage(msg: ChatMessageViewModel): boolean {
    return !msg.deleted && msg.deliveryStatus !== 'sending' && (this.isOwnMessage(msg) || this.isCurrentUserAdmin());
  }

  canReactMessage(msg: ChatMessageViewModel): boolean {
    return !msg.deleted && msg.deliveryStatus === 'sent';
  }

  canReplyMessage(msg: ChatMessageViewModel): boolean {
    return !msg.deleted && msg.deliveryStatus === 'sent';
  }

  // --- Reactions Logic ---
  getReactionGroups(reactions?: any[]): ReactionGroup[] {
    if (!reactions || reactions.length === 0) return [];
    const currentUserId = this.currentUser()?.id;
    const groupMap = new Map<string, { count: number; hasReacted: boolean; userNames: string[] }>();

    reactions.forEach(r => {
      const code = r.reactionCode;
      const isMine = r.user?.id === currentUserId;
      const userName = r.user?.fullName || 'Member';

      if (!groupMap.has(code)) {
        groupMap.set(code, { count: 1, hasReacted: isMine, userNames: [userName] });
      } else {
        const item = groupMap.get(code)!;
        item.count += 1;
        if (isMine) item.hasReacted = true;
        item.userNames.push(userName);
      }
    });

    return Array.from(groupMap.entries()).map(([reactionCode, data]) => ({
      reactionCode,
      count: data.count,
      hasReacted: data.hasReacted,
      userNames: data.userNames
    }));
  }

  toggleReaction(msg: ChatMessageViewModel, emoji: string): void {
    if (!this.canReactMessage(msg)) return;
    this.closeReactionPicker();
    this.closeActionMenu();

    const currentUserId = this.currentUser()?.id;
    if (!currentUserId) return;

    // Optimistic reaction update
    const currentReactions = msg.reactions || [];
    const existingIdx = currentReactions.findIndex(r => r.reactionCode === emoji && r.user?.id === currentUserId);
    let updatedReactions = [...currentReactions];

    if (existingIdx >= 0) {
      updatedReactions.splice(existingIdx, 1);
    } else {
      updatedReactions.push({
        id: 'temp-' + Date.now(),
        reactionCode: emoji,
        user: this.currentUser()!,
        createdAt: new Date().toISOString()
      });
    }

    this.messages.update(current =>
      current.map(m => m.id === msg.id ? { ...m, reactions: updatedReactions } : m)
    );

    this.chatService.toggleReaction(msg.id, emoji).subscribe({
      next: () => {},
      error: () => {
        // Revert on error
        this.messages.update(current =>
          current.map(m => m.id === msg.id ? { ...m, reactions: currentReactions } : m)
        );
        this.snackBar.open('Failed to update reaction', 'Dismiss', { duration: 2500 });
      }
    });
  }

  openReactionPicker(messageId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.activeActionMenuMessageId.set(null);
    this.activeReactionPickerMessageId.set(messageId);
  }

  closeReactionPicker(): void {
    this.activeReactionPickerMessageId.set(null);
  }

  // --- Reply Logic ---
  startReply(msg: ChatMessageViewModel): void {
    if (!this.canReplyMessage(msg)) return;
    this.closeAllPopups();
    this.replyingToMessage.set(msg);
    if (this.editingMessage()) {
      this.cancelEdit();
    }
    setTimeout(() => {
      this.composerTextarea?.nativeElement?.focus();
    }, 50);
  }

  cancelReply(): void {
    this.replyingToMessage.set(null);
  }

  scrollToMessage(targetMessageId?: string): void {
    if (!targetMessageId) return;
    const el = document.getElementById('chat-msg-' + targetMessageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlighted-reply-target');
      setTimeout(() => {
        el.classList.remove('highlighted-reply-target');
      }, 1800);
    } else {
      this.snackBar.open('Referenced message is not in current view', 'Dismiss', { duration: 2500 });
    }
  }

  // --- Edit Logic ---
  startEdit(msg: ChatMessageViewModel): void {
    if (!this.canEditMessage(msg)) return;
    this.closeAllPopups();
    this.cancelReply();
    this.cancelImageSelection();
    this.editingMessage.set(msg);
    this.composerText = msg.textContent || '';
    setTimeout(() => {
      this.composerTextarea?.nativeElement?.focus();
    }, 50);
  }

  cancelEdit(): void {
    this.editingMessage.set(null);
    this.composerText = '';
  }

  saveEdit(): void {
    const editTarget = this.editingMessage();
    if (!editTarget) return;

    const trimmed = this.composerText.trim();
    if (!trimmed) {
      this.snackBar.open('Edited message text cannot be empty', 'Dismiss', { duration: 2500 });
      return;
    }

    if (trimmed === editTarget.textContent) {
      this.cancelEdit();
      return;
    }

    const previousText = editTarget.textContent;
    // Optimistic update
    this.messages.update(current =>
      current.map(m => m.id === editTarget.id ? { ...m, textContent: trimmed, edited: true } : m)
    );
    this.editingMessage.set(null);
    this.composerText = '';

    this.chatService.editMessage(editTarget.id, trimmed).subscribe({
      next: (serverMsg) => {
        this.messages.update(current =>
          current.map(m => m.id === editTarget.id ? { ...m, ...serverMsg, deliveryStatus: 'sent' } : m)
        );
      },
      error: (err) => {
        // Revert on error
        this.messages.update(current =>
          current.map(m => m.id === editTarget.id ? { ...m, textContent: previousText } : m)
        );
        const msg = err?.error?.message || 'Failed to save message edit';
        this.snackBar.open(msg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  // --- Delete Logic ---
  openDeleteDialog(msg: ChatMessageViewModel): void {
    if (!this.canDeleteMessage(msg)) return;
    this.closeAllPopups();
    this.confirmDeleteMessage.set(msg);
  }

  cancelDeleteDialog(): void {
    this.confirmDeleteMessage.set(null);
  }

  confirmDelete(): void {
    const msg = this.confirmDeleteMessage();
    if (!msg) return;
    this.cancelDeleteDialog();

    const previousDeleted = msg.deleted;
    const previousContent = msg.textContent;

    // Optimistic delete
    this.messages.update(current =>
      current.map(m => m.id === msg.id
        ? { ...m, deleted: true, textContent: 'This message was deleted', mediaUrl: undefined, localPreviewUrl: undefined, reactions: [] }
        : m
      )
    );

    this.chatService.deleteMessage(msg.id).subscribe({
      next: () => {},
      error: (err) => {
        // Revert on failure
        this.messages.update(current =>
          current.map(m => m.id === msg.id
            ? { ...m, deleted: previousDeleted, textContent: previousContent }
            : m
          )
        );
        const errMsg = err?.error?.message || 'Failed to delete message';
        this.snackBar.open(errMsg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  // --- Action Menu & Overlay helpers ---
  toggleActionMenu(messageId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.activeActionMenuMessageId() === messageId) {
      this.activeActionMenuMessageId.set(null);
    } else {
      this.activeReactionPickerMessageId.set(null);
      this.activeActionMenuMessageId.set(messageId);
    }
  }

  closeActionMenu(): void {
    this.activeActionMenuMessageId.set(null);
  }

  closeAllPopups(): void {
    this.activeActionMenuMessageId.set(null);
    this.activeReactionPickerMessageId.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.message-action-menu-dropdown') && !target.closest('.reaction-picker-bar')) {
      this.closeAllPopups();
    }
  }

  // --- Lightbox Media Viewer & Helpers ---
  openImageViewer(msg: ChatMessageViewModel): void {
    if (msg.deleted) return;
    const url = msg.mediaUrl || msg.localPreviewUrl;
    if (!url) return;

    this.activeViewerItem.set({
      url,
      messageType: 'IMAGE',
      caption: msg.textContent,
      senderName: msg.sender?.fullName,
      timestamp: msg.createdAt,
      originalFileName: msg.originalFileName
    });
  }

  openVideoViewer(msg: ChatMessageViewModel): void {
    if (msg.deleted) return;
    const url = msg.mediaUrl || msg.localPreviewUrl;
    if (!url) return;

    this.activeViewerItem.set({
      url,
      messageType: 'VIDEO',
      caption: msg.textContent,
      senderName: msg.sender?.fullName,
      timestamp: msg.createdAt,
      originalFileName: msg.originalFileName
    });
  }

  openMediaViewer(item: ChatMediaItem): void {
    const url = item.mediaUrl;
    if (!url) return;
    this.activeViewerItem.set({
      url,
      messageType: item.messageType || 'IMAGE',
      caption: item.caption,
      senderName: item.senderName || item.sender?.fullName,
      timestamp: item.createdAt,
      originalFileName: item.originalFileName
    });
  }

  closeImageViewer(): void {
    this.activeViewerItem.set(null);
  }

  downloadAttachment(url?: string, filename?: string, messageId?: string): void {
    const currentGroupId = this.activeGroupId();
    if (messageId && currentGroupId) {
      this.chatService.getDocumentSignedUrl(currentGroupId, messageId).subscribe({
        next: (res) => {
          const downloadUrl = res?.url || url;
          if (downloadUrl) {
            this.triggerBrowserDownload(downloadUrl, res?.fileName || filename);
          }
        },
        error: () => {
          if (url) {
            this.triggerBrowserDownload(url, filename);
          }
        }
      });
      return;
    }

    if (url) {
      this.triggerBrowserDownload(url, filename);
    }
  }

  private triggerBrowserDownload(url: string, filename?: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'attachment';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  getFileIcon(filename?: string, format?: string): string {
    const ext = (format || filename?.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'table_chart';
      case 'ppt':
      case 'pptx':
        return 'slideshow';
      case 'txt':
        return 'text_snippet';
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return 'folder_zip';
      default:
        return 'insert_drive_file';
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formatted = (bytes / Math.pow(1024, i)).toFixed(1);
    return `${formatted} ${units[i]}`;
  }

  formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.activeViewerItem()) {
      this.closeImageViewer();
    } else if (this.confirmDeleteMessage()) {
      this.cancelDeleteDialog();
    } else if (this.activeReactionPickerMessageId() || this.activeActionMenuMessageId()) {
      this.closeAllPopups();
    } else if (this.editingMessage()) {
      this.cancelEdit();
    } else if (this.replyingToMessage()) {
      this.cancelReply();
    }
  }

  private updateGroupLastMessage(groupId: string, msg: ChatMessage): void {
    this.groups.update(list =>
      list.map(g => g.id === groupId ? { ...g, lastMessage: msg, updatedAt: msg.createdAt } : g)
    );
  }

  private scrollToBottom(force: boolean = false): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (!el) return;
      const threshold = 180;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      if (force || isNearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  }

  // --- Group Info Drawer ---
  toggleInfoDrawer(): void {
    this.isInfoDrawerOpen.update(open => !open);
  }

  closeInfoDrawer(): void {
    this.isInfoDrawerOpen.set(false);
  }

  // --- Create Group Modal ---
  openCreateModal(): void {
    this.newGroupName = '';
    this.newGroupDescription = '';
    this.newGroupAvatarUrl = '';
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreateGroup(): void {
    if (!this.newGroupName || !this.newGroupName.trim()) {
      this.snackBar.open('Please enter a group name', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isCreatingGroup.set(true);
    const dto: ChatGroupCreateDto = {
      name: this.newGroupName.trim(),
      description: this.newGroupDescription ? this.newGroupDescription.trim() : undefined,
      avatarUrl: this.newGroupAvatarUrl ? this.newGroupAvatarUrl.trim() : undefined
    };

    this.chatService.createGroup(dto).subscribe({
      next: created => {
        this.isCreatingGroup.set(false);
        this.closeCreateModal();
        this.snackBar.open(`Group "${created.name}" created!`, 'OK', { duration: 3000 });
        this.selectGroup(created.id);
      },
      error: err => {
        this.isCreatingGroup.set(false);
        const msg = err?.error?.message || 'Failed to create group. Please try again.';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      }
    });
  }

  // --- Phase 9: Message Search Methods ---
  toggleSearch(): void {
    const next = !this.isSearchOpen();
    this.isSearchOpen.set(next);
    if (!next) {
      this.clearMessageSearch();
    }
  }

  onMessageSearchChange(query: string): void {
    this.messageSearchQuery.set(query);
    this.messageSearchSubject.next(query);
  }

  clearMessageSearch(): void {
    this.messageSearchQuery.set('');
    this.searchResults.set([]);
    this.isSearchingMessages.set(false);
  }

  executeMessageSearch(query: string): void {
    const groupId = this.activeGroupId();
    if (!groupId || !query || !query.trim()) {
      this.searchResults.set([]);
      this.isSearchingMessages.set(false);
      return;
    }
    this.isSearchingMessages.set(true);
    this.chatService.searchGroupMessages(groupId, query.trim(), 0, 30).subscribe({
      next: res => {
        this.searchResults.set(res?.content || []);
        this.isSearchingMessages.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearchingMessages.set(false);
      }
    });
  }

  selectSearchResult(result: ChatMessageSearchResult): void {
    const targetId = result.messageId || result.id;
    this.isSearchOpen.set(false);
    this.clearMessageSearch();
    if (targetId) {
      this.scrollToMessage(targetId);
    }
  }

  // --- Phase 9 & 11: Media Gallery, Files & Lightbox Methods ---
  setDrawerTab(tab: 'members' | 'media' | 'files'): void {
    this.drawerActiveTab.set(tab);
    if (tab === 'media' && this.activeGroupId()) {
      this.loadGroupMedia(this.activeGroupId()!);
    } else if (tab === 'files' && this.activeGroupId()) {
      this.loadGroupFiles(this.activeGroupId()!);
    }
  }

  loadGroupMedia(groupId: string): void {
    this.isMediaLoading.set(true);
    this.chatService.getGroupMedia(groupId, 0, 50).subscribe({
      next: res => {
        this.mediaGalleryItems.set(res?.content || []);
        this.isMediaLoading.set(false);
      },
      error: () => {
        this.mediaGalleryItems.set([]);
        this.isMediaLoading.set(false);
      }
    });
  }

  loadGroupFiles(groupId: string): void {
    this.isFilesLoading.set(true);
    this.chatService.getGroupFiles(groupId, 0, 50).subscribe({
      next: res => {
        this.fileGalleryItems.set(res?.content || []);
        this.isFilesLoading.set(false);
      },
      error: () => {
        this.fileGalleryItems.set([]);
        this.isFilesLoading.set(false);
      }
    });
  }

  openGalleryLightbox(item: ChatMediaItem, index: number): void {
    this.activeViewerGallery.set(this.mediaGalleryItems());
    this.activeViewerIndex.set(index);
    this.activeViewerItem.set({
      url: item.mediaUrl,
      messageType: item.messageType || 'IMAGE',
      caption: item.caption,
      senderName: item.senderName || item.sender?.fullName,
      timestamp: item.createdAt,
      originalFileName: item.originalFileName
    });
  }

  prevLightboxImage(): void {
    const gallery = this.activeViewerGallery();
    const idx = this.activeViewerIndex();
    if (gallery.length > 0 && idx > 0) {
      const prevIdx = idx - 1;
      const prevItem = gallery[prevIdx];
      this.activeViewerIndex.set(prevIdx);
      this.activeViewerItem.set({
        url: prevItem.mediaUrl,
        messageType: prevItem.messageType || 'IMAGE',
        caption: prevItem.caption,
        senderName: prevItem.senderName || prevItem.sender?.fullName,
        timestamp: prevItem.createdAt,
        originalFileName: prevItem.originalFileName
      });
    }
  }

  nextLightboxImage(): void {
    const gallery = this.activeViewerGallery();
    const idx = this.activeViewerIndex();
    if (gallery.length > 0 && idx < gallery.length - 1) {
      const nextIdx = idx + 1;
      const nextItem = gallery[nextIdx];
      this.activeViewerIndex.set(nextIdx);
      this.activeViewerItem.set({
        url: nextItem.mediaUrl,
        messageType: nextItem.messageType || 'IMAGE',
        caption: nextItem.caption,
        senderName: nextItem.senderName || nextItem.sender?.fullName,
        timestamp: nextItem.createdAt,
        originalFileName: nextItem.originalFileName
      });
    }
  }

  jumpToMessageFromLightbox(): void {
    const gallery = this.activeViewerGallery();
    const idx = this.activeViewerIndex();
    if (gallery.length > 0 && idx >= 0 && idx < gallery.length) {
      const item = gallery[idx];
      const targetId = item.messageId || item.id;
      this.closeImageViewer();
      this.closeInfoDrawer();
      if (targetId) {
        this.scrollToMessage(targetId);
      }
    }
  }

  // --- Phase 9: Settings & Avatar Management ---
  openSettingsModal(): void {
    const group = this.activeGroupDetail();
    if (!group) return;
    this.editGroupName = group.name;
    this.editGroupDescription = group.description || '';
    this.selectedAvatarFile.set(null);
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
    }
    this.avatarPreviewUrl.set(null);
    this.isSettingsModalOpen.set(true);
  }

  closeSettingsModal(): void {
    this.isSettingsModalOpen.set(false);
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
    }
    this.avatarPreviewUrl.set(null);
    this.selectedAvatarFile.set(null);
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select a valid image file', 'Dismiss', { duration: 3000 });
      input.value = '';
      return;
    }

    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
    }
    const preview = URL.createObjectURL(file);
    this.selectedAvatarFile.set(file);
    this.avatarPreviewUrl.set(preview);
  }

  submitGroupSettings(): void {
    const groupId = this.activeGroupId();
    if (!groupId || !this.editGroupName.trim()) {
      this.snackBar.open('Group name is required', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isUpdatingSettings.set(true);
    const updateDto: ChatGroupUpdateDto = {
      name: this.editGroupName.trim(),
      description: this.editGroupDescription ? this.editGroupDescription.trim() : undefined
    };

    this.chatService.updateGroup(groupId, updateDto).subscribe({
      next: (updated) => {
        const avatarFile = this.selectedAvatarFile();
        if (avatarFile) {
          this.chatService.uploadGroupAvatar(groupId, avatarFile).subscribe({
            next: (withAvatar) => {
              this.activeGroupDetail.set(withAvatar);
              this.isUpdatingSettings.set(false);
              this.closeSettingsModal();
              this.snackBar.open('Group settings and avatar updated successfully', 'OK', { duration: 3000 });
              this.fetchGroups();
            },
            error: (err) => {
              this.activeGroupDetail.set(updated);
              this.isUpdatingSettings.set(false);
              this.closeSettingsModal();
              const msg = err?.error?.message || 'Updated group details, but avatar upload failed';
              this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
              this.fetchGroups();
            }
          });
        } else {
          this.activeGroupDetail.set(updated);
          this.isUpdatingSettings.set(false);
          this.closeSettingsModal();
          this.snackBar.open('Group settings updated successfully', 'OK', { duration: 3000 });
          this.fetchGroups();
        }
      },
      error: (err) => {
        this.isUpdatingSettings.set(false);
        const msg = err?.error?.message || 'Failed to update group settings';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      }
    });
  }

  // --- Phase 9: Member Management ---
  openAddMemberModal(): void {
    this.newMemberUserId = '';
    this.isAddMemberModalOpen.set(true);
  }

  closeAddMemberModal(): void {
    this.isAddMemberModalOpen.set(false);
    this.newMemberUserId = '';
  }

  submitAddMember(): void {
    const groupId = this.activeGroupId();
    if (!groupId || !this.newMemberUserId.trim()) {
      this.snackBar.open('Please enter a valid User ID', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isAddingMember.set(true);
    this.chatService.addMember(groupId, { userId: this.newMemberUserId.trim(), role: 'MEMBER' }).subscribe({
      next: () => {
        this.isAddingMember.set(false);
        this.closeAddMemberModal();
        this.snackBar.open('Member added successfully', 'OK', { duration: 3000 });
        this.loadGroupMembers(groupId);
      },
      error: (err) => {
        this.isAddingMember.set(false);
        const msg = err?.error?.message || 'Failed to add member. Check user ID.';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      }
    });
  }

  updateMemberRole(member: ChatGroupMember, newRole: 'ADMIN' | 'MEMBER'): void {
    const groupId = this.activeGroupId();
    if (!groupId || !member.user) return;

    this.chatService.updateMemberRole(groupId, member.user.id, newRole).subscribe({
      next: () => {
        this.activeGroupMembers.update(members =>
          members.map(m => m.user?.id === member.user.id ? { ...m, role: newRole } : m)
        );
        this.snackBar.open(`Updated ${member.user.fullName} role to ${newRole}`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to update member role';
        this.snackBar.open(msg, 'Dismiss', { duration: 3500 });
      }
    });
  }

  promptRemoveMember(member: ChatGroupMember): void {
    this.confirmRemoveMember.set(member);
  }

  cancelRemoveMember(): void {
    this.confirmRemoveMember.set(null);
  }

  confirmRemoveMemberAction(): void {
    const member = this.confirmRemoveMember();
    const groupId = this.activeGroupId();
    if (!member || !groupId || !member.user) return;

    this.isRemovingMember.set(true);
    this.chatService.removeMember(groupId, member.user.id).subscribe({
      next: () => {
        this.isRemovingMember.set(false);
        this.confirmRemoveMember.set(null);
        this.activeGroupMembers.update(members => members.filter(m => m.user?.id !== member.user.id));
        this.snackBar.open(`Removed ${member.user.fullName} from group`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.isRemovingMember.set(false);
        const msg = err?.error?.message || 'Failed to remove member';
        this.snackBar.open(msg, 'Dismiss', { duration: 3500 });
      }
    });
  }

  // --- Message helpers ---
  isOwnMessage(msg: ChatMessage): boolean {
    const userId = this.currentUser()?.id;
    return !!userId && msg.sender?.id === userId;
  }

  formatTime(isoString?: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  shouldShowDateSeparator(currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean {
    if (!prevMsg) return true;
    const curDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return curDate !== prevDate;
  }

  getDateSeparatorLabel(isoString?: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).toUpperCase();
    }
  }

  shouldShowSenderName(currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean {
    if (this.isOwnMessage(currentMsg)) return false;
    if (!prevMsg) return true;
    if (prevMsg.sender?.id !== currentMsg.sender?.id) return true;
    const curTime = new Date(currentMsg.createdAt).getTime();
    const prevTime = new Date(prevMsg.createdAt).getTime();
    return (curTime - prevTime) > 5 * 60 * 1000; // 5 minutes gap
  }
}
