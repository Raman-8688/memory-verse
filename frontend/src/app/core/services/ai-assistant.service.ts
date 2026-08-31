import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AiChatRequest, AiChatResponse, ChatMessage } from '../models/ai.model';

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private readonly api = inject(ApiService);

  readonly conversationId = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  private readonly initialWelcomeMessage: ChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: 'Welcome back! I am your MemoryVerse Assistant. Ask me anything about your shared memories, road trips, hostel days, farewell celebrations, or college milestones.',
    timestamp: new Date(),
    mode: 'MEMORY',
    suggestedQuestions: [
      'Show me our first year memories',
      'Do we have any farewell photos?',
      'What happened during the annual cultural fest?',
      'Show me photos from our campus road trips'
    ]
  };

  readonly messages = signal<ChatMessage[]>([this.initialWelcomeMessage]);
  readonly currentSuggestions = signal<string[]>([
    'Show me our first year memories',
    'Do we have any farewell photos?',
    'What happened during the annual cultural fest?',
    'Show me photos from our campus road trips'
  ]);

  async sendMessage(prompt: string): Promise<void> {
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt || this.isLoading()) return;

    const userMessageId = 'msg-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: cleanPrompt,
      timestamp: new Date()
    };

    // Append user message immediately
    this.messages.update(prev => [...prev, userMsg]);
    this.isLoading.set(true);

    try {
      const payload: AiChatRequest = {
        message: cleanPrompt,
        conversationId: this.conversationId() || undefined
      };

      const response = await firstValueFrom(
        this.api.post<AiChatResponse>('/ai/chat', payload)
      );

      if (response.conversationId) {
        this.conversationId.set(response.conversationId);
      }

      const assistantMsg: ChatMessage = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        mode: response.mode,
        relatedMemories: response.relatedMemories || [],
        relatedMedia: response.relatedMedia || [],
        suggestedQuestions: response.suggestedQuestions || []
      };

      this.messages.update(prev => [...prev, assistantMsg]);

      if (response.suggestedQuestions && response.suggestedQuestions.length > 0) {
        this.currentSuggestions.set(response.suggestedQuestions);
      }
    } catch (err: any) {
      console.error('AI Chat request error:', err);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'I encountered an issue connecting to the memory assistant service. Please verify network connectivity and try again.',
        timestamp: new Date(),
        mode: 'GENERAL'
      };
      this.messages.update(prev => [...prev, errorMsg]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadInitialSuggestions(): Promise<void> {
    try {
      const suggestions = await firstValueFrom(
        this.api.get<string[]>('/ai/suggestions')
      );
      if (suggestions && suggestions.length > 0) {
        this.currentSuggestions.set(suggestions);
      }
    } catch {
      // Keep defaults on failure
    }
  }

  clearConversation(): void {
    this.conversationId.set(null);
    this.messages.set([{
      ...this.initialWelcomeMessage,
      timestamp: new Date()
    }]);
    this.currentSuggestions.set(this.initialWelcomeMessage.suggestedQuestions || []);
  }
}
