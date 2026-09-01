import { Component, ElementRef, OnInit, ViewChild, HostListener, inject, signal, effect, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiAssistantService } from '@core/services/ai-assistant.service';
import { RelatedMedia, RelatedMemory } from '@core/models/ai.model';
import { GalleryItem } from '@core/models/gallery.model';
import { MediaViewerData, MediaViewerModalComponent } from '@shared/components/media-viewer-modal.component';

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
  template: `
    <div class="assistant-page">
      <!-- Editorial Header -->
      <header class="assistant-header">
        <div class="header-info">
          <span class="sub-label">AI Memory Intelligence</span>
          <h1 class="editorial-title">Memory Assistant</h1>
          <p class="header-desc">
            Explore your memories naturally. Ask about road trips, hostel stories, farewell moments, or batchmates.
          </p>
        </div>

        <div class="header-actions">
          <!-- Model Selector Dropdown -->
          <div class="model-picker-container" (click)="$event.stopPropagation()">
            <button type="button" 
                    class="model-picker-btn" 
                    (click)="toggleModelDropdown()" 
                    [class.active]="showModelDropdown()"
                    title="Switch AI Model">
              <span class="model-bot-icon">🤖</span>
              <span class="model-label-text">{{ getSelectedModelName() }}</span>
              <mat-icon class="chevron-icon">{{ showModelDropdown() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>

            @if (showModelDropdown()) {
              <div class="model-dropdown-menu">
                @for (model of aiService.availableModels(); track model.id) {
                  <button type="button" 
                          class="model-dropdown-item" 
                          [class.selected]="aiService.selectedModel() === model.id"
                          (click)="onSelectModel(model.id)">
                    <span class="item-name">{{ model.name }}</span>
                    @if (model.badge) {
                      <span class="item-badge">{{ model.badge }}</span>
                    }
                  </button>
                }
              </div>
            }
          </div>

          <button mat-stroked-button class="reset-chat-btn" (click)="resetConversation()" title="Start a fresh conversation">
            <mat-icon>restart_alt</mat-icon>
            <span>New Chat</span>
          </button>
        </div>
      </header>

      <!-- Scrollable Message Feed -->
      <main class="chat-feed" #chatFeed>
        @for (msg of aiService.messages(); track msg.id) {
          @if (msg.role === 'user') {
            <!-- User Message Bubble -->
            <div class="message-row user-row">
              <div class="user-bubble">
                <p class="message-text">{{ msg.content }}</p>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
            </div>
          } @else {
            <!-- Assistant Message Row -->
            <div class="message-row assistant-row">
              <div class="assistant-avatar">
                <mat-icon>auto_awesome</mat-icon>
              </div>

              <div class="assistant-content-wrapper">
                <article class="assistant-bubble">
                  <!-- Text Answer -->
                  <div class="assistant-text">{{ msg.content }}</div>

                  <!-- Related Memories Horizontal Rail -->
                  @if (msg.relatedMemories && msg.relatedMemories.length > 0) {
                    <div class="rich-block memories-block">
                      <div class="block-title">
                        <mat-icon>auto_stories</mat-icon>
                        <span>Related Memories ({{ msg.relatedMemories.length }})</span>
                      </div>

                      <div class="horizontal-memory-rail">
                        @for (mem of msg.relatedMemories; track mem.id) {
                          <div class="memory-card" (click)="goToMemory(mem.id)">
                            @if (mem.coverImageUrl) {
                              <img [src]="mem.coverImageUrl" [alt]="mem.title" class="memory-cover" loading="lazy" />
                            } @else {
                              <div class="memory-cover-placeholder">
                                <mat-icon>photo_library</mat-icon>
                              </div>
                            }

                            <div class="memory-card-body">
                              <span class="memory-date">{{ formatDate(mem.memoryDate) }}</span>
                              <h4 class="memory-card-title">{{ mem.title }}</h4>
                              @if (mem.journeyTitle) {
                                <span class="journey-badge">{{ mem.journeyTitle }}</span>
                              }
                              @if (mem.story) {
                                <p class="memory-excerpt">{{ mem.story }}</p>
                              }
                              <div class="memory-card-footer">
                                <span class="media-count-tag" *ngIf="mem.mediaCount > 0">
                                  <mat-icon>collections</mat-icon>
                                  <span>{{ mem.mediaCount }} items</span>
                                </span>
                                <button mat-icon-button class="card-nav-btn" (click)="$event.stopPropagation(); goToMemory(mem.id)">
                                  <mat-icon>arrow_forward</mat-icon>
                                </button>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Related Media Grid -->
                  @if (msg.relatedMedia && msg.relatedMedia.length > 0) {
                    <div class="rich-block media-block">
                      <div class="block-title">
                        <mat-icon>collections</mat-icon>
                        <span>Preserved Photographs & Videos ({{ msg.relatedMedia.length }})</span>
                      </div>

                      <div class="media-grid">
                        @for (media of msg.relatedMedia; track media.id; let i = $index) {
                          <div class="media-tile" (click)="openLightbox(msg.relatedMedia, i)">
                            @if (media.mediaType === 'VIDEO') {
                              <video [src]="media.mediaUrl" class="tile-content" muted></video>
                              <div class="video-indicator">
                                <mat-icon>play_circle_filled</mat-icon>
                                <span>Video</span>
                              </div>
                            } @else {
                              <img [src]="media.thumbnailUrl || media.mediaUrl" [alt]="media.fileName || 'Memory photo'" class="tile-content" loading="lazy" />
                            }
                            <div class="tile-hover-overlay">
                              <mat-icon>fullscreen</mat-icon>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </article>

                <span class="message-time assistant-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
            </div>
          }
        }

        <!-- Loading / Typing Shimmer State -->
        @if (aiService.isLoading()) {
          <div class="message-row assistant-row loading-row">
            <div class="assistant-avatar pulse">
              <mat-icon>auto_awesome</mat-icon>
            </div>
            <div class="assistant-bubble loading-bubble">
              <div class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <span class="loading-label">Searching journey records & synthesizing memories...</span>
            </div>
          </div>
        }
      </main>

      <!-- Sticky Bottom Interaction Console -->
      <footer class="interaction-console">
        <!-- Contextual Suggested Questions Chips -->
        @if (aiService.currentSuggestions() && aiService.currentSuggestions().length > 0) {
          <div class="suggestions-rail">
            <span class="suggestions-hint">Suggested:</span>
            <div class="chips-container">
              @for (question of aiService.currentSuggestions(); track question) {
                <button type="button" class="suggestion-chip" (click)="sendPresetQuestion(question)" [disabled]="aiService.isLoading()">
                  <mat-icon class="chip-icon">sparkles</mat-icon>
                  <span>{{ question }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Input Bar Form -->
        <form class="input-bar" (ngSubmit)="submitMessage()">
          <input
            #messageInput
            type="text"
            [(ngModel)]="userInput"
            name="userInput"
            placeholder="Ask about memories, road trips, fests, or friends (e.g. 'Show our farewell in 2024')..."
            [disabled]="aiService.isLoading()"
            class="chat-input"
            autocomplete="off"
          />

          <button
            mat-mini-fab
            color="primary"
            type="submit"
            [disabled]="!userInput.trim() || aiService.isLoading()"
            class="send-action-btn"
            aria-label="Send message"
          >
            @if (aiService.isLoading()) {
              <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
            } @else {
              <mat-icon>arrow_upward</mat-icon>
            }
          </button>
        </form>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .assistant-page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 72px);
      max-width: 1040px;
      width: 100%;
      margin: 0 auto;
      background-color: var(--mv-bg-main);
      box-sizing: border-box;
      overflow-x: hidden;
    }

    /* Header */
    .assistant-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: var(--space-2) var(--space-3) var(--space-2);
      border-bottom: 1px solid var(--mv-border);
      flex-shrink: 0;
      gap: var(--space-2);
    }

    .sub-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--mv-primary);
      display: block;
    }

    .editorial-title {
      font-size: 1.85rem;
      margin: 2px 0 4px;
      line-height: 1.15;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.88rem;
      margin: 0;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Model Picker Styles matching user reference */
    .model-picker-container {
      position: relative;
    }

    .model-picker-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .model-picker-btn:hover, .model-picker-btn.active {
      border-color: #3b82f6;
      background: #1e293b;
    }

    .model-bot-icon {
      font-size: 1rem;
      line-height: 1;
    }

    .model-label-text {
      max-width: 210px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chevron-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    .model-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 290px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
      padding: 4px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: fadeInDropdown 0.15s ease-out;
    }

    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .model-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 9px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 0.84rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .model-dropdown-item:hover {
      background: #1e293b;
      color: #ffffff;
    }

    .model-dropdown-item.selected {
      background: #2563eb !important;
      color: #ffffff !important;
      font-weight: 600;
    }

    .item-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-badge {
      font-size: 0.68rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.18);
      color: inherit;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-left: 8px;
      white-space: nowrap;
    }

    .reset-chat-btn {
      border-color: var(--mv-border);
      color: var(--mv-text-secondary);
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .reset-chat-btn:hover {
      background-color: var(--mv-bg-subtle);
      color: var(--mv-text-primary);
    }

    /* Chat Feed */
    .chat-feed {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4) var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      scroll-behavior: smooth;
    }

    .message-row {
      display: flex;
      width: 100%;
    }

    .user-row {
      justify-content: flex-end;
    }

    .user-bubble {
      background-color: #fef3c7; /* Warm amber-100 */
      color: #78350f; /* Amber-900 */
      border: 1px solid #fde68a;
      border-radius: 18px 18px 4px 18px;
      padding: 12px 18px;
      max-width: 75%;
      box-shadow: var(--shadow-subtle);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-bubble .message-text {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
      font-family: var(--font-ui);
      word-break: break-word;
    }

    .message-time {
      font-size: 0.7rem;
      color: var(--mv-text-muted);
      align-self: flex-end;
    }

    .assistant-time {
      align-self: flex-start;
      margin-left: 4px;
      margin-top: 4px;
    }

    /* Assistant Bubble */
    .assistant-row {
      align-items: flex-start;
      gap: 12px;
    }

    .assistant-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #b45309);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(180, 83, 9, 0.25);
    }

    .assistant-avatar mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .assistant-avatar.pulse {
      animation: pulseGlow 1.5s infinite ease-in-out;
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 0.85; }
    }

    .assistant-content-wrapper {
      display: flex;
      flex-direction: column;
      max-width: calc(100% - 48px);
      width: 100%;
    }

    .assistant-bubble {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: 18px 18px 18px 4px;
      padding: 16px 20px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .assistant-text {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--mv-text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Rich Blocks Inside Assistant */
    .rich-block {
      border-top: 1px solid var(--mv-border);
      padding-top: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .block-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mv-primary);
    }

    .block-title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Horizontal Memory Rail */
    .horizontal-memory-rail {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .memory-card {
      min-width: 250px;
      max-width: 270px;
      background: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .memory-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card);
    }

    .memory-cover {
      width: 100%;
      height: 130px;
      object-fit: cover;
    }

    .memory-cover-placeholder {
      width: 100%;
      height: 130px;
      background-color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
    }

    .memory-card-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .memory-date {
      font-size: 0.75rem;
      color: var(--mv-text-muted);
      font-weight: 500;
    }

    .memory-card-title {
      font-family: var(--font-editorial);
      font-size: 1.1rem;
      margin: 0;
      line-height: 1.25;
      font-weight: 600;
      color: var(--mv-text-primary);
    }

    .journey-badge {
      font-size: 0.7rem;
      background: #fef3c7;
      color: #92400e;
      padding: 2px 6px;
      border-radius: 4px;
      align-self: flex-start;
      margin-top: 2px;
    }

    .memory-excerpt {
      font-size: 0.8rem;
      color: var(--mv-text-secondary);
      line-height: 1.35;
      margin: 4px 0 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .memory-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 8px;
    }

    .media-count-tag {
      font-size: 0.72rem;
      color: var(--mv-text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .media-count-tag mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .card-nav-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;
      color: var(--mv-primary);
    }

    .card-nav-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Media Grid */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 8px;
    }

    .media-tile {
      position: relative;
      aspect-ratio: 1;
      border-radius: var(--radius-sm);
      overflow: hidden;
      cursor: pointer;
      background-color: #1c1917;
    }

    .tile-content {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .media-tile:hover .tile-content {
      transform: scale(1.05);
    }

    .video-indicator {
      position: absolute;
      bottom: 4px;
      left: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .video-indicator mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .tile-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      color: #ffffff;
    }

    .media-tile:hover .tile-hover-overlay {
      opacity: 1;
    }

    /* Loading state */
    .loading-bubble {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
    }

    .typing-indicator .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--mv-primary);
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .loading-label {
      font-size: 0.88rem;
      color: var(--mv-text-muted);
      font-style: italic;
    }

    /* Interaction Console (Bottom) */
    .interaction-console {
      flex-shrink: 0;
      border-top: 1px solid var(--mv-border);
      background-color: var(--mv-bg-surface);
      padding: var(--space-2) var(--space-3) var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .suggestions-rail {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .suggestions-hint {
      font-size: 0.75rem;
      color: var(--mv-text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .chips-container {
      display: flex;
      gap: 6px;
      white-space: nowrap;
    }

    .suggestion-chip {
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 0.8rem;
      color: var(--mv-text-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }

    .suggestion-chip:hover:not(:disabled) {
      background-color: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .suggestion-chip:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .chip-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mv-primary);
    }

    /* Input Bar */
    .input-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--mv-bg-main);
      border: 1px solid var(--mv-border);
      border-radius: 28px;
      padding: 4px 6px 4px 18px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .input-bar:focus-within {
      border-color: var(--mv-primary);
      box-shadow: 0 0 0 2px rgba(180, 83, 9, 0.15);
    }

    .chat-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.95rem;
      color: var(--mv-text-primary);
      font-family: var(--font-ui);
      padding: 8px 0;
    }

    .chat-input::placeholder {
      color: var(--mv-text-muted);
    }

    .send-action-btn {
      width: 38px;
      height: 38px;
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      flex-shrink: 0;
    }

    .send-action-btn:disabled {
      background-color: #e5e7eb !important;
      color: #9ca3af !important;
    }

    .btn-spinner {
      margin: auto;
    }

    /* Responsive Mobile Tweaks */
    @media (max-width: 768px) {
      .assistant-page {
        height: calc(100vh - 64px);
      }

      .assistant-header {
        padding: var(--space-2);
      }

      .editorial-title {
        font-size: 1.45rem;
      }

      .header-desc {
        display: none;
      }

      .user-bubble {
        max-width: 88%;
      }

      .assistant-content-wrapper {
        max-width: calc(100% - 40px);
      }

      .memory-card {
        min-width: 220px;
        max-width: 230px;
      }

      .interaction-console {
        padding: 8px 12px 72px; /* Bottom clearance for mobile-nav bar */
      }
    }
  `]
})
export class AssistantComponent implements OnInit {
  readonly aiService = inject(AiAssistantService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  @ViewChild('chatFeed') private chatFeedRef!: ElementRef<HTMLElement>;
  @ViewChild('messageInput') private messageInputRef!: ElementRef<HTMLInputElement>;

  userInput: string = '';
  readonly showModelDropdown = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(): void {
    this.showModelDropdown.set(false);
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
    // Automatically scroll to bottom whenever messages or loading state updates
    effect(() => {
      // Access signals to track them
      this.aiService.messages();
      this.aiService.isLoading();
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    this.aiService.loadInitialSuggestions();
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
