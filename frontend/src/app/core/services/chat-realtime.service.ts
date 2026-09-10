import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import {
  ChatRealtimeEvent,
  RealtimeConnectionStatus
} from '../models/chat-realtime.model';
import { ChatMessageSendDto } from '../models/chat.model';

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

  // Reconnection backoff parameters (Phase 12D)
  private readonly initialDelayMs = 1000;
  private readonly maxDelayMs = 30000;
  private readonly backoffMultiplier = 1.8;
  private readonly jitterFactor = 0.25; // +/- 25% randomized jitter
  private reconnectAttempt = 0;
  private reconnectTimer: any = null;
  private connectionStableTimer: any = null;
  private isTerminalAuthError = false;

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
      untracked(() => {
        if (token) {
          this.isTerminalAuthError = false;
          this.connect();
        } else {
          this.disconnect();
        }
      });
    }, { allowSignalWrites: true });
  }

  connect(): void {
    const token = this.authService.token();
    if (!token || this.isTerminalAuthError) {
      this.connectionStatus.set('DISCONNECTED');
      return;
    }

    if (this.client && (this.client.active || this.client.connected)) {
      return;
    }

    this.clearReconnectTimer();

    if (this.reconnectAttempt > 0) {
      this.connectionStatus.set('RECONNECTING');
    } else {
      this.connectionStatus.set('CONNECTING');
    }

    const brokerUrl = this.resolveBrokerUrl();

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 0, // Handled manually with exponential backoff + randomized jitter
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        const isReconnect = this.wasEverConnected;
        this.wasEverConnected = true;
        this.connectionStatus.set('CONNECTED');

        // Mark connection stable after 5 continuous seconds to reset backoff attempt counter
        this.clearConnectionStableTimer();
        this.connectionStableTimer = setTimeout(() => {
          this.reconnectAttempt = 0;
        }, 5000);

        // Safe Resubscribe: Subscribe to user-specific notifications topic
        this.subscribeToUserNotifications();

        // Safe Resubscribe: Restore current active group subscription if connection was restored
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
        this.clearConnectionStableTimer();
        this.connectionStatus.set('DISCONNECTED');
        this.scheduleReconnect();
      },
      onStompError: (frame) => {
        this.clearConnectionStableTimer();
        const errorMsg = frame.headers['message'] || '';
        const body = frame.body || '';
        
        // Terminal check for auth rejection
        if (
          errorMsg.toLowerCase().includes('unauthorized') ||
          errorMsg.toLowerCase().includes('jwt') ||
          errorMsg.toLowerCase().includes('invalid token') ||
          body.toLowerCase().includes('unauthorized')
        ) {
          console.warn('[STOMP] Terminal authentication error. Halting reconnection attempts.');
          this.isTerminalAuthError = true;
          this.disconnect();
          return;
        }

        this.connectionStatus.set('DISCONNECTED');
        this.scheduleReconnect();
      },
      onWebSocketClose: (event) => {
        this.clearConnectionStableTimer();

        // Codes 4001/4003 or policy violations imply auth failure
        if (event.code === 4001 || event.code === 4003) {
          console.warn(`[STOMP] WebSocket closed with auth code ${event.code}. Halting reconnect.`);
          this.isTerminalAuthError = true;
          this.disconnect();
          return;
        }

        if (this.authService.token() && !this.isTerminalAuthError) {
          this.connectionStatus.set('RECONNECTING');
          this.scheduleReconnect();
        } else {
          this.connectionStatus.set('DISCONNECTED');
        }
      }
    });

    this.client.activate();
  }

  private scheduleReconnect(): void {
    if (!this.authService.token() || this.isTerminalAuthError) {
      this.connectionStatus.set('DISCONNECTED');
      return;
    }

    this.clearReconnectTimer();

    const delay = this.calculateNextBackoffDelay();
    this.reconnectAttempt++;
    this.connectionStatus.set('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      if (!this.client || !this.client.connected) {
        if (this.client) {
          try {
            this.client.deactivate();
          } catch {
            // Safe cleanup
          }
          this.client = null;
        }
        this.connect();
      }
    }, delay);
  }

  private calculateNextBackoffDelay(): number {
    // Exponential backoff
    const base = Math.min(
      this.initialDelayMs * Math.pow(this.backoffMultiplier, this.reconnectAttempt),
      this.maxDelayMs
    );
    // Randomized jitter (+/- jitterFactor)
    const jitterMultiplier = 1 + (Math.random() * 2 * this.jitterFactor - this.jitterFactor);
    const randomizedDelay = Math.round(base * jitterMultiplier);
    return Math.max(500, Math.min(randomizedDelay, this.maxDelayMs));
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectionStableTimer(): void {
    if (this.connectionStableTimer) {
      clearTimeout(this.connectionStableTimer);
      this.connectionStableTimer = null;
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.clearConnectionStableTimer();
    this.unsubscribeCurrentGroup();
    this.unsubscribeUserNotifications();
    if (this.client) {
      try {
        this.client.deactivate();
      } catch {
        // Safe deactivation
      }
      this.client = null;
    }
    this.reconnectAttempt = 0;
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
    const apiUrl = (environment.apiUrl || '').replace(/\/+$/, '');

    if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://') + '/ws';
    } else if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://') + '/ws';
    } else if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${proto}//${host}/api/ws`;
    }
    return 'ws://localhost:8080/api/ws';
  }
}
