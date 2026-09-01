export interface AiChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  isDefault?: boolean;
}

export interface RelatedMemory {
  id: string;
  title: string;
  story: string;
  memoryDate: string;
  locationName?: string;
  journeyTitle?: string;
  sectionTitle?: string;
  coverImageUrl?: string;
  mediaCount: number;
}

export interface RelatedMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
  durationSeconds?: number;
  memoryId?: string;
  memoryTitle?: string;
}

export interface AiChatResponse {
  conversationId: string;
  mode: 'MEMORY' | 'GENERAL';
  answer: string;
  relatedMemories: RelatedMemory[];
  relatedMedia: RelatedMedia[];
  suggestedQuestions: string[];
  modelUsed?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: 'MEMORY' | 'GENERAL';
  relatedMemories?: RelatedMemory[];
  relatedMedia?: RelatedMedia[];
  suggestedQuestions?: string[];
  modelUsed?: string;
}
