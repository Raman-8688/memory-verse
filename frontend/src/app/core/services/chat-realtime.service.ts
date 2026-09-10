import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import {
  ChatRealtimeEvent,
  RealtimeConnectionStatus
} from '../models/chat-realtime.model';
import { ChatMessage, ChatMessageSendDto } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatRealtimeService {
  private readonly authService = inject(AuthService);

  private client: Client | null = null;
  private activeSubscription: StompSubscription | null = null;
  private userNotificationSubscription: StompSubscription | null = null;
  private activeSubscribedGroupId: string | null = null;
  private activeEventCallback: ((event: ChatRealtimeEvent<any>) => void) | null = null;
  private wasEverConnected = false;

  // Connection State Signals
  readonly connectionStatus = signal<RealtimeConnectionStatus>('DISCONNECTED');
  readonly isConnected = computed(() => this.connectionStatus() === 'CONNECTED');

  // Reconnection Subject for REST message reconciliation
  private readonly reconnectedSubject = new Subject<void>();
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

  // Incoming Global Event Subject (for background notifications/badges)
  private readonly incomingEventSubject = new Subject<ChatRealtimeEvent<any>>();
  readonly incomingEvent$: Observable<ChatRealtimeEvent<any>> = this.incomingEventSubject.asObservable();

  constructor() {
    // Auto-manage connection based on authentication state
    effect(() => {
      const token = this.authService.token();
      if (token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  connect(): void {
    const token = this.authService.token();
    if (!token) {
      this.connectionStatus.set('DISCONNECTED');
      return;
    }

    if (this.client && this.client.active) {
      return;
    }

    this.connectionStatus.set('CONNECTING');

    const brokerUrl = this.resolveBrokerUrl();

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        const isReconnect = this.wasEverConnected;
        this.wasEverConnected = true;
        this.connectionStatus.set('CONNECTED');

        // Subscribe to user-specific notifications topic
        this.subscribeToUserNotifications();

        // Resubscribe to current active group if connection was dropped and restored
        if (this.activeSubscribedGroupId && this.activeEventCallback) {
          const groupId = this.activeSubscribedGroupId;
          const callback = this.activeEventCallback;
          this.activeSubscription = null;
          this.subscribeToGroup(groupId, callback);
        }

        if (isReconnect) {
          this.reconnectedSubject.next();
        }
      },
      onDisconnect: () => {
        this.connectionStatus.set('DISCONNECTED');
      },
      onStompError: () => {
        this.connectionStatus.set('DISCONNECTED');
      },
      onWebSocketClose: () => {
        if (this.authService.token()) {
          this.connectionStatus.set('RECONNECTING');
        } else {
          this.connectionStatus.set('DISCONNECTED');
        }
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    this.unsubscribeCurrentGroup();
    this.unsubscribeUserNotifications();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.wasEverConnected = false;
    this.connectionStatus.set('DISCONNECTED');
  }

  private subscribeToUserNotifications(): void {
    const user = this.authService.currentUser();
    if (!user || !user.id || !this.client || !this.client.connected) return;

    this.unsubscribeUserNotifications();

    const destination = `/topic/users/${user.id}/notifications`;
    this.userNotificationSubscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const parsedEvent: ChatRealtimeEvent<any> = JSON.parse(message.body);
        this.incomingEventSubject.next(parsedEvent);
      } catch {
        // Safe JSON parse guard
      }
    });
  }

  private unsubscribeUserNotifications(): void {
    if (this.userNotificationSubscription) {
      try {
        this.userNotificationSubscription.unsubscribe();
      } catch {
        // Safe guard
      }
      this.userNotificationSubscription = null;
    }
  }

  subscribeToGroup(
    groupId: string,
    onEvent: (event: ChatRealtimeEvent<any>) => void
  ): void {
    if (!groupId) return;

    // If already subscribed to the same group with active subscription, keep it
    if (this.activeSubscribedGroupId === groupId && this.activeSubscription) {
      this.activeEventCallback = onEvent;
      return;
    }

    // Clean up any existing group subscription first
    this.unsubscribeCurrentGroup();

    this.activeSubscribedGroupId = groupId;
    this.activeEventCallback = onEvent;

    // If client is connected, perform STOMP subscription
    if (this.client && this.client.connected) {
      const destination = `/topic/chat/groups/${groupId}`;
      this.activeSubscription = this.client.subscribe(
        destination,
        (message: IMessage) => {
          try {
            const parsedEvent: ChatRealtimeEvent<any> = JSON.parse(message.body);
            if (this.activeEventCallback) {
              this.activeEventCallback(parsedEvent);
            }
            this.incomingEventSubject.next(parsedEvent);
          } catch {
            // Safe JSON parse guard
          }
        }
      );
    }
  }

  unsubscribeCurrentGroup(): void {
    if (this.activeSubscription) {
      try {
        this.activeSubscription.unsubscribe();
      } catch {
        // Safe unsubscribe guard
      }
      this.activeSubscription = null;
    }
    this.activeSubscribedGroupId = null;
    this.activeEventCallback = null;
  }

  sendMessage(groupId: string, dto: ChatMessageSendDto): boolean {
    if (!this.client || !this.client.connected) {
      return false;
    }

    const destination = `/app/chat/groups/${groupId}/send`;
    try {
      this.client.publish({
        destination,
        body: JSON.stringify(dto)
      });
      return true;
    } catch {
      return false;
    }
  }

  sendTyping(groupId: string, typing: boolean): boolean {
    if (!this.client || !this.client.connected || !groupId) {
      return false;
    }

    const destination = `/app/chat/groups/${groupId}/typing`;
    try {
      this.client.publish({
        destination,
        body: JSON.stringify({ typing })
      });
      return true;
    } catch {
      return false;
    }
  }

  private resolveBrokerUrl(): string {
    const apiUrl = environment.apiUrl || '';
    // Normalize base URL without trailing /api
    const base = apiUrl.replace(/\/api\/?$/, '');

    if (base.startsWith('https://')) {
      return base.replace('https://', 'wss://') + '/ws';
    } else if (base.startsWith('http://')) {
      return base.replace('http://', 'ws://') + '/ws';
    } else if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${proto}//${host}/ws`;
    }
    return 'ws://localhost:8080/ws';
  }
}
