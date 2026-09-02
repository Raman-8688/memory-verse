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

import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { RelatedMedia } from '../../core/models/ai.model';
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
    MatTooltipModule
  ],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent implements OnInit {
  readonly aiService = inject(AiAssistantService);
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
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    this.aiService.loadInitialSuggestions();

    // Check if query was forwarded from the dashboard search bar
    const query = this.route.snapshot.queryParamMap.get('q');
    if (query?.trim()) {
      this.aiService.sendMessage(query.trim());
    }
  }

  submitMessage(): void {
    const text = this.userInput?.trim();
    if (!text || this.aiService.isLoading()) return;

    this.userInput = '';
    this.aiService.sendMessage(text);
  }

  sendPresetQuestion(question: string): void {
    if (this.aiService.isLoading()) return;
    this.aiService.sendMessage(question);
  }

  resetConversation(): void {
    this.aiService.clearConversation();
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
