import { Component, ElementRef, OnInit, ViewChild, HostListener, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { ResolveMediaUrlPipe } from '@shared/pipes/resolve-media-url.pipe';

import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AiSearchService } from '../../core/services/ai-search.service';
import { ChatMessage, RelatedMedia, RelatedMemory } from '../../core/models/ai.model';
import { MemorySearchFilter, SearchActionChip } from '../../core/models/ai-search.model';
import { MediaViewerModalComponent, MediaViewerData } from '../../shared/components/media-viewer-modal.component';
import { GalleryItem } from '../../core/models/gallery.model';

@Component({
  selector: 'mv-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ImageFallbackDirective,
    ResolveMediaUrlPipe
  ],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent implements OnInit {
  readonly aiService = inject(AiAssistantService);
  readonly aiSearchService = inject(AiSearchService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  @ViewChild('chatFeed') private chatFeedRef!: ElementRef<HTMLElement>;
  @ViewChild('messageInput') private messageInputRef!: ElementRef<HTMLInputElement>;

  userInput: string = '';
  readonly showModelDropdown = signal<boolean>(false);
  readonly expandedWhySet = signal<Set<string>>(new Set());

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showModelDropdown.set(false);
  }

  toggleWhyMemory(memoryId: string): void {
    this.expandedWhySet.update(set => {
      const next = new Set(set);
      if (next.has(memoryId)) {
        next.delete(memoryId);
      } else {
        next.add(memoryId);
      }
      return next;
    });
  }

  isWhyExpanded(memoryId: string): boolean {
    return this.expandedWhySet().has(memoryId);
  }

  toggleModelDropdown(): void {
    this.showModelDropdown.update(v => !v);
  }

  onSelectModel(modelId: string): void {
    this.aiService.setModel(modelId);
    this.showModelDropdown.set(false);
  }

  getSelectedModelName(): string {
    return this.aiService.getSelectedModelInfo().name;
  }

  constructor() {
    effect(() => {
      this.aiService.messages();
      this.aiService.isLoading();
      this.aiSearchService.isLoadingSummary();
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    this.aiService.loadInitialSuggestions();

    // Check if query was forwarded from the dashboard search bar
    const query = this.route.snapshot.queryParamMap.get('q');
    if (query?.trim()) {
      this.dispatchQuery(query.trim());
    }
  }

  submitMessage(): void {
    const text = this.userInput?.trim();
    if (!text || this.aiService.isLoading() || this.aiSearchService.isLoadingSummary()) return;

    this.userInput = '';
    this.dispatchQuery(text);
  }

  sendPresetQuestion(question: string): void {
    if (this.aiService.isLoading() || this.aiSearchService.isLoadingSummary()) return;
    this.dispatchQuery(question);
  }

  dispatchQuery(query: string, contextToken?: string, previousFilters?: MemorySearchFilter): void {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: cleanQuery,
      timestamp: new Date()
    };

    this.aiService.messages.update(prev => [...prev, userMsg]);
    this.aiService.isLoading.set(true);

    // Tier 1 Progressive Disclosure Search
    this.aiSearchService.getSearchSummary(cleanQuery, previousFilters, contextToken).subscribe({
      next: (summary) => {
        this.aiService.isLoading.set(false);

        if (summary.matchingMemoryCount > 0 || summary.totalImageCount > 0 || summary.totalVideoCount > 0 ||
            (summary.suggestedActions && summary.suggestedActions.length > 0)) {
          const assistantMsg: ChatMessage = {
            id: 'reply-' + Date.now(),
            role: 'assistant',
            content: summary.conversationalSummary,
            timestamp: new Date(),
            mode: 'MEMORY',
            searchToken: summary.searchToken,
            searchSummary: summary,
            actionChips: summary.suggestedActions || [],
            relatedMemories: [],
            relatedMedia: [],
            isLoadingRecords: false,
            activeRecordView: null
          };
          this.aiService.messages.update(prev => [...prev, assistantMsg]);
        } else {
          // If no direct memory hits, leverage general conversational AI fallback
          this.aiService.sendMessage(cleanQuery);
        }
      },
      error: (err) => {
        console.warn('AI Search summary unavailable, falling back to chat provider:', err);
        this.aiService.sendMessage(cleanQuery);
      }
    });
  }

  triggerActionChip(chip: SearchActionChip, msg: ChatMessage): void {
    if (chip.action === 'VIEW_PHOTOS' || chip.action === 'VIEW_VIDEOS') {
      if (msg.relatedMedia && msg.relatedMedia.length > 0) {
        msg.activeRecordView = msg.activeRecordView === 'MEDIA' ? null : 'MEDIA';
        return;
      }

      if (!msg.searchToken) return;
      msg.isLoadingRecords = true;

      this.aiSearchService.fetchRecords(msg.searchToken, 'MEDIA', 0, 50).subscribe({
        next: (res) => {
          msg.isLoadingRecords = false;
          msg.relatedMedia = res.mediaItems || [];
          msg.activeRecordView = 'MEDIA';
          if (msg.relatedMedia.length > 0) {
            this.openLightbox(msg.relatedMedia, 0);
          }
        },
        error: (err) => {
          msg.isLoadingRecords = false;
          console.error('Failed to fetch media records:', err);
        }
      });
    } else if (chip.action === 'VIEW_MEMORIES') {
      if (msg.relatedMemories && msg.relatedMemories.length > 0) {
        msg.activeRecordView = msg.activeRecordView === 'MEMORIES' ? null : 'MEMORIES';
        return;
      }

      if (!msg.searchToken) return;
      msg.isLoadingRecords = true;

      this.aiSearchService.fetchRecords(msg.searchToken, 'MEMORIES', 0, 20).subscribe({
        next: (res) => {
          msg.isLoadingRecords = false;
          msg.relatedMemories = (res.memories || []).map(m => ({
            id: m.id,
            title: m.title,
            story: m.story,
            memoryDate: m.memoryDate,
            locationName: m.locationName,
            journeyTitle: m.journeyTitle,
            sectionTitle: m.sectionTitle,
            coverImageUrl: m.coverImageUrl || (m.mediaList?.[0]?.thumbnailUrl || m.mediaList?.[0]?.mediaUrl),
            mediaCount: m.mediaList?.length || 0
          }));
          msg.activeRecordView = 'MEMORIES';
        },
        error: (err) => {
          msg.isLoadingRecords = false;
          console.error('Failed to fetch memory records:', err);
        }
      });
    } else if (chip.action === 'FILTER_PERSON') {
      const name = chip.value || chip.label.replace(/^(Filter by|Only)\s+/i, '');
      this.dispatchQuery(`Only ${name}`, msg.searchToken, msg.searchSummary?.activeFilters);
    } else if (chip.action === 'FILTER_LOCATION') {
      const loc = chip.value || chip.label.replace(/^(Filter by|In)\s+/i, '');
      this.dispatchQuery(`In ${loc}`, msg.searchToken, msg.searchSummary?.activeFilters);
    }
  }

  resetConversation(): void {
    this.aiService.clearConversation();
    this.aiSearchService.clearContext();
    if (this.messageInputRef) {
      this.messageInputRef.nativeElement.focus();
    }
  }

  goToMemory(memoryId: string): void {
    this.router.navigate(['/memories', memoryId]);
  }

  openLightbox(mediaList: RelatedMedia[], startIndex: number): void {
    const galleryItems: GalleryItem[] = mediaList.map((m, idx) => ({
      id: m.id,
      mediaUrl: m.mediaUrl,
      thumbnailUrl: m.thumbnailUrl || m.mediaUrl,
      mediaType: m.mediaType as any,
      fileName: m.fileName,
      durationSeconds: m.durationSeconds,
      displayOrder: idx + 1,
      memoryId: m.memoryId,
      memoryTitle: m.memoryTitle,
      createdAt: new Date().toISOString()
    }));

    const data: MediaViewerData = {
      items: galleryItems,
      startIndex
    };

    this.dialog.open(MediaViewerModalComponent, {
      data,
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatFeedRef?.nativeElement) {
        const el = this.chatFeedRef.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
