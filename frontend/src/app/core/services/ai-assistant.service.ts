import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AiChatRequest, AiChatResponse, AiModelInfo, ChatMessage } from '../models/ai.model';

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private readonly api = inject(ApiService);

  readonly conversationId = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  readonly defaultModels: AiModelInfo[] = [
    { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B (Fast & Verified Working)', badge: 'Fast & Verified', isDefault: true },
    { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B (High Intelligence)', badge: 'High Intelligence' },
    { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', name: 'Nemotron 3 Reasoning (Reasoning AI)', badge: 'Reasoning AI' },
    { id: 'nvidia/nemotron-3.5-lightning-30b-a3b', name: 'Nemotron 3.5 Lightning (High Speed)', badge: 'High Speed' },
    { id: 'minimaxai/minimax-m3', name: 'MiniMax M3 (Conversational)', badge: 'Dialogue' }
  ];

  readonly availableModels = signal<AiModelInfo[]>(this.defaultModels);
  readonly selectedModel = signal<string>(
    (typeof localStorage !== 'undefined' && localStorage.getItem('mv_ai_model')) || 'meta/llama-3.2-11b-vision-instruct'
  );

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

  constructor() {
    this.loadModels();
    this.loadInitialSuggestions();
  }

  setModel(modelId: string): void {
    this.selectedModel.set(modelId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mv_ai_model', modelId);
    }
  }

  getSelectedModelInfo(): AiModelInfo {
    const currentId = this.selectedModel();
    return this.availableModels().find(m => m.id === currentId) || this.defaultModels[0];
  }

  async loadModels(): Promise<void> {
    try {
      const models = await firstValueFrom(
        this.api.get<AiModelInfo[]>('/ai/models')
      );
      if (models && models.length > 0) {
        this.availableModels.set(models);
      }
    } catch {
      // Keep default models catalog
    }
  }

  async sendMessage(prompt: string, modelOverride?: string): Promise<void> {
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt || this.isLoading()) return;

    const chosenModel = modelOverride || this.selectedModel();

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
        conversationId: this.conversationId() || undefined,
        model: chosenModel
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
        suggestedQuestions: response.suggestedQuestions || [],
        modelUsed: response.modelUsed || chosenModel
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
        content: 'I am having trouble connecting to my neural network right now. Please check your API configuration or try again in a moment.',
        timestamp: new Date(),
        mode: 'GENERAL',
        modelUsed: chosenModel
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
