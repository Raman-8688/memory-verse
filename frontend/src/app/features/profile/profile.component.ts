import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { MemoryService } from '@core/services/memory.service';
import { Memory, PrivacyLevel } from '@core/models/memory.model';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';

@Component({
  selector: 'mv-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  template: `
    <div class="profile-page">
      <!-- Profile Header Hero -->
      @if (auth.currentUser(); as user) {
        <section class="profile-hero">
          <div class="profile-avatar-wrap">
            <img [src]="user.avatarUrl || defaultAvatar" [alt]="user.fullName" mvFallback class="profile-avatar" />

            <!-- Single Avatar Image File Input -->
            <input 
              type="file" 
              #avatarFileInput 
              accept="image/*" 
              (change)="onAvatarFileSelected($event, user.id)" 
              style="display: none;" />

            <button 
              mat-mini-fab 
              class="avatar-camera-fab" 
              (click)="avatarFileInput.click()" 
              [disabled]="isUploadingAvatar()" 
              title="Change Profile Photo (Select 1 image)">
              @if (isUploadingAvatar()) {
                <mat-spinner diameter="16" class="avatar-spinner"></mat-spinner>
              } @else {
                <mat-icon>photo_camera</mat-icon>
              }
            </button>

            <span class="role-badge" [class.admin]="user.role === 'ADMIN'">
              {{ user.role }}
            </span>
          </div>

          <div class="profile-meta">
            <span class="user-sub">MemoryVerse Member</span>
            <h1 class="editorial-title">{{ user.fullName }}</h1>
            <div class="contact-chips">
              <span class="chip"><mat-icon>mail</mat-icon>{{ user.email }}</span>
              <span class="chip"><mat-icon>calendar_today</mat-icon>Active Contributor</span>
            </div>
          </div>
        </section>
      }

      <!-- Profile Section Tabs -->
      <div class="profile-tabs-nav">
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'memories'" 
          (click)="activeTab.set('memories')">
          <mat-icon>photo_library</mat-icon>
          <span>Tagged Moments ({{ taggedMemories().length }})</span>
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'security'" 
          (click)="activeTab.set('security')">
          <mat-icon>security</mat-icon>
          <span>Security & Data Privacy</span>
        </button>
      </div>

      <!-- TAB 1: Tagged Memories -->
      @if (activeTab() === 'memories') {
        <section class="tagged-section">
          <div class="section-header">
            <div>
              <h2 class="editorial-title section-title">Memories Tagged In</h2>
              <p class="section-subtitle">Moments captured by friends that feature you.</p>
            </div>
            <span class="count-badge">{{ taggedMemories().length }} memories</span>
          </div>

          @if (isLoading()) {
            <div class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Loading your tagged moments...</span>
            </div>
          } @else if (taggedMemories().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">photo_library</mat-icon>
              <h3 class="editorial-title">No Tagged Memories Yet</h3>
              <p>When friends tag you in memories or campus road trips, they will appear here.</p>
              <a mat-flat-button color="primary" routerLink="/memories/new">
                <ng-container>
                  <mat-icon>add_photo_alternate</mat-icon>
                  <span>Create a Memory</span>
                </ng-container>
              </a>
            </div>
          } @else {
            <div class="memories-grid">
              @for (memory of taggedMemories(); track memory.id) {
                <a class="memory-card" [routerLink]="['/memories', memory.id]">
                  <div class="card-thumb">
                    @if (memory.mediaList && memory.mediaList.length > 0) {
                      @if (memory.mediaList[0].mediaType === 'VIDEO') {
                        <div class="video-preview-wrapper">
                          <video [src]="memory.mediaList[0].mediaUrl" preload="metadata"></video>
                          <div class="play-badge"><mat-icon>play_arrow</mat-icon></div>
                        </div>
                      } @else {
                        <img [src]="memory.mediaList[0].thumbnailUrl || memory.mediaList[0].mediaUrl" 
                             [alt]="memory.title" 
                             mvFallback />
                      }
                    } @else {
                      <div class="no-thumb"><mat-icon>image</mat-icon></div>
                    }
                    <span class="card-date">{{ memory.memoryDate | date:'mediumDate' }}</span>
                  </div>

                  <div class="card-info">
                    <h3 class="memory-title">{{ memory.title }}</h3>
                    @if (memory.locationName) {
                      <span class="location-tag">
                        <mat-icon>place</mat-icon>
                        {{ memory.locationName }}
                      </span>
                    }
                    <p class="memory-snippet">{{ memory.story }}</p>
                  </div>
                </a>
              }
            </div>
          }
        </section>
      }

      <!-- TAB 2: Security & Data Privacy -->
      @if (activeTab() === 'security') {
        <section class="security-section">
          <!-- Card 1: Default Privacy Setting -->
          <div class="settings-card">
            <div class="card-header-row">
              <div class="card-icon-bubble primary">
                <mat-icon>lock</mat-icon>
              </div>
              <div>
                <h2 class="card-title">Default Memory Privacy</h2>
                <p class="card-subtitle">Set the default visibility level applied when creating new memories or rapid captures.</p>
              </div>
            </div>

            <div class="privacy-options-grid">
              <!-- Option A: Private -->
              <div class="privacy-option-box" 
                   [class.selected]="defaultPrivacy() === 'PRIVATE_TO_ME'"
                   (click)="setDefaultPrivacy('PRIVATE_TO_ME')">
                <div class="option-top">
                  <mat-icon class="option-icon">lock_outline</mat-icon>
                  <span class="radio-circle" [class.checked]="defaultPrivacy() === 'PRIVATE_TO_ME'"></span>
                </div>
                <h4 class="option-title">Private to Me</h4>
                <p class="option-desc">Only visible to your personal account. Stored securely and excluded from circles.</p>
              </div>

              <!-- Option B: Circle Companions -->
              <div class="privacy-option-box" 
                   [class.selected]="defaultPrivacy() === 'CIRCLE_COMPANIONS'"
                   (click)="setDefaultPrivacy('CIRCLE_COMPANIONS')">
                <div class="option-top">
                  <mat-icon class="option-icon">group</mat-icon>
                  <span class="badge-recommended">Recommended</span>
                  <span class="radio-circle" [class.checked]="defaultPrivacy() === 'CIRCLE_COMPANIONS'"></span>
                </div>
                <h4 class="option-title">Circle Companions</h4>
                <p class="option-desc">Shared with all registered circle members to view, react, and contribute comments.</p>
              </div>

              <!-- Option C: Public Archive -->
              <div class="privacy-option-box" 
                   [class.selected]="defaultPrivacy() === 'PUBLIC_ARCHIVE'"
                   (click)="setDefaultPrivacy('PUBLIC_ARCHIVE')">
                <div class="option-top">
                  <mat-icon class="option-icon">public</mat-icon>
                  <span class="radio-circle" [class.checked]="defaultPrivacy() === 'PUBLIC_ARCHIVE'"></span>
                </div>
                <h4 class="option-title">Public Archive</h4>
                <p class="option-desc">Discoverable via public links and read-only keepsake storybooks.</p>
              </div>
            </div>
          </div>

          <!-- Card 2: Data Portability & Archive -->
          <div class="settings-card">
            <div class="card-header-row">
              <div class="card-icon-bubble amber">
                <mat-icon>archive</mat-icon>
              </div>
              <div class="header-text-flex">
                <div>
                  <h2 class="card-title">Data Portability</h2>
                  <p class="card-subtitle">Exports all your authored memories, comments, reactions, and media metadata into a structured portable bundle.</p>
                </div>
                <button 
                  mat-flat-button 
                  color="primary" 
                  class="download-btn"
                  (click)="downloadFullArchive()"
                  [disabled]="isExportingArchive()">
                  @if (isExportingArchive()) {
                    <mat-spinner diameter="18"></mat-spinner>
                    <span>Generating ZIP...</span>
                  } @else {
                    <ng-container>
                      <mat-icon>download</mat-icon>
                      <span>Download My Full Archive (ZIP)</span>
                    </ng-container>
                  }
                </button>
              </div>
            </div>
            <div class="archive-info-callout">
              <mat-icon>info</mat-icon>
              <span>The portable archive contains JSON payloads, a human-readable markdown summary (archive-summary.md), and an indexed media asset manifest.</span>
            </div>
          </div>

          <!-- Card 3: Danger Zone / Account Deletion -->
          <div class="settings-card danger-card">
            <div class="card-header-row">
              <div class="card-icon-bubble red">
                <mat-icon>warning</mat-icon>
              </div>
              <div>
                <h2 class="card-title danger-title">Danger Zone</h2>
                <p class="card-subtitle">Irreversible actions regarding your account and identity.</p>
              </div>
            </div>

            <div class="danger-body">
              <div class="danger-explanation">
                <p><strong>Permanently Delete Account:</strong> This will permanently delete your account, remove you from circles, and revoke access to shared journeys. This action cannot be undone.</p>
              </div>

              @if (!showDeleteModal()) {
                <button 
                  type="button" 
                  class="btn-danger-outline" 
                  (click)="showDeleteModal.set(true)">
                  <mat-icon>delete_forever</mat-icon>
                  <span>Delete Account</span>
                </button>
              } @else {
                <div class="delete-confirmation-box">
                  <p class="confirm-prompt">To proceed with deletion, type <strong>DELETE</strong> in the box below:</p>
                  <div class="confirm-input-row">
                    <input 
                      type="text" 
                      class="confirm-input" 
                      placeholder="DELETE" 
                      [ngModel]="deleteConfirmationInput()" 
                      (ngModelChange)="deleteConfirmationInput.set($event)" />
                    <button 
                      type="button" 
                      class="btn-danger-solid" 
                      [disabled]="deleteConfirmationInput().trim().toUpperCase() !== 'DELETE' || isDeletingAccount()"
                      (click)="confirmDeleteAccount()">
                      @if (isDeletingAccount()) {
                        <mat-spinner diameter="16"></mat-spinner>
                      } @else {
                        <span>Confirm Deletion</span>
                      }
                    </button>
                    <button 
                      type="button" 
                      class="btn-secondary" 
                      (click)="showDeleteModal.set(false)">
                      Cancel
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding-bottom: var(--space-8);
    }

    .profile-hero {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-xl);
      border: 1px solid var(--mv-border);
      padding: var(--space-6);
      display: flex;
      align-items: center;
      gap: var(--space-6);
      box-shadow: var(--shadow-card);
      flex-wrap: wrap;
    }

    .profile-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .profile-avatar {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--mv-primary);
      box-shadow: var(--shadow-sm);
    }

    .role-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      background-color: var(--mv-primary);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .avatar-camera-fab {
      position: absolute !important;
      top: -4px;
      right: -4px;
      width: 34px !important;
      height: 34px !important;
      background-color: #ffffff !important;
      color: var(--mv-primary) !important;
      border: 1px solid var(--mv-border) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer;
      transition: all 0.2s ease !important;
      z-index: 2;
    }

    .avatar-camera-fab:hover {
      background-color: #fef3c7 !important;
      transform: scale(1.1);
    }

    .avatar-camera-fab mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
    }

    .avatar-spinner {
      margin: 0 !important;
    }

    .role-badge.admin {
      background-color: #854d0e;
    }

    .profile-meta {
      flex: 1;
      min-width: 250px;
    }

    .user-sub {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.2rem;
      margin: 2px 0 8px 0;
    }

    .contact-chips {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.86rem;
      color: var(--mv-text-secondary);
      background-color: var(--mv-bg-subtle);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
    }

    .chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mv-text-muted);
    }

    /* Tab switcher */
    .profile-tabs-nav {
      display: flex;
      gap: 12px;
      border-bottom: 2px solid var(--mv-border);
      padding-bottom: 2px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      padding: 10px 18px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--mv-text-secondary);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--mv-text-primary);
      background-color: var(--mv-bg-subtle);
    }

    .tab-btn.active {
      color: var(--mv-primary);
      border-bottom: 3px solid var(--mv-primary);
      margin-bottom: -2px;
    }

    .tab-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Tagged Section */
    .tagged-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid var(--mv-border);
      padding-bottom: var(--space-3);
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .section-title {
      font-size: 1.8rem;
      margin: 0;
    }

    .section-subtitle {
      color: var(--mv-text-secondary);
      font-size: 0.9rem;
      margin: 4px 0 0 0;
    }

    .count-badge {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--mv-text-muted);
      background-color: var(--mv-bg-subtle);
      padding: 4px 12px;
      border-radius: var(--radius-full);
    }

    .memories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .memory-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-card);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .memory-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-lg);
    }

    .card-thumb {
      height: 190px;
      position: relative;
      background-color: var(--mv-bg-subtle);
      overflow: hidden;
    }

    .card-thumb img, .card-thumb video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-preview-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .play-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(0,0,0,0.6);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-date {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.65);
      color: #ffffff;
      font-size: 0.74rem;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      backdrop-filter: blur(4px);
    }

    .no-thumb {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mv-text-muted);
    }

    .card-info {
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .memory-title {
      font-family: var(--font-serif);
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0;
      color: var(--mv-text-primary);
    }

    .location-tag {
      font-size: 0.8rem;
      color: var(--mv-primary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .location-tag mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .memory-snippet {
      font-size: 0.86rem;
      color: var(--mv-text-secondary);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .loading-state, .empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      background: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mv-text-muted);
    }

    /* Security & Privacy Section */
    .security-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .settings-card {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .card-header-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .card-icon-bubble {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-icon-bubble.primary {
      background: #eff6ff;
      color: #2563eb;
    }

    .card-icon-bubble.amber {
      background: #fef3c7;
      color: #b45309;
    }

    .card-icon-bubble.red {
      background: #fee2e2;
      color: #dc2626;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: var(--mv-text-primary);
    }

    .card-subtitle {
      font-size: 0.88rem;
      color: var(--mv-text-secondary);
      margin: 0;
      line-height: 1.45;
    }

    .header-text-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      gap: 16px;
      flex-wrap: wrap;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 42px;
      font-weight: 600;
      white-space: nowrap;
    }

    .archive-info-callout {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: 0.84rem;
      color: var(--mv-text-secondary);
    }

    .archive-info-callout mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mv-text-muted);
    }

    /* Privacy options cards */
    .privacy-options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .privacy-option-box {
      border: 2px solid var(--mv-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      background: var(--mv-bg-surface);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .privacy-option-box:hover {
      border-color: var(--mv-primary);
      background: #fdfaf6;
    }

    .privacy-option-box.selected {
      border-color: var(--mv-primary);
      background: #fffbeb;
      box-shadow: 0 0 0 1px var(--mv-primary);
    }

    .option-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .option-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--mv-primary);
    }

    .badge-recommended {
      background: #fef3c7;
      color: #92400e;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .radio-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--mv-border);
      display: inline-block;
      transition: all 0.2s ease;
      position: relative;
    }

    .radio-circle.checked {
      border-color: var(--mv-primary);
      background-color: var(--mv-primary);
    }

    .radio-circle.checked::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
    }

    .option-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
      color: var(--mv-text-primary);
    }

    .option-desc {
      font-size: 0.82rem;
      color: var(--mv-text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    /* Danger Card */
    .danger-card {
      border-color: #fca5a5;
      background-color: #fffafa;
    }

    .danger-title {
      color: #b91c1c;
    }

    .danger-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .danger-explanation p {
      margin: 0;
      font-size: 0.88rem;
      color: #7f1d1d;
      line-height: 1.5;
    }

    .btn-danger-outline {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      color: #dc2626;
      border: 1px solid #dc2626;
      padding: 8px 18px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-danger-outline:hover {
      background: #dc2626;
      color: #ffffff;
    }

    .delete-confirmation-box {
      background: #ffffff;
      border: 1px solid #f87171;
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 540px;
    }

    .confirm-prompt {
      font-size: 0.88rem;
      color: #991b1b;
      margin: 0;
    }

    .confirm-input-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .confirm-input {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      outline: none;
      width: 140px;
    }

    .confirm-input:focus {
      border-color: #dc2626;
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
    }

    .btn-danger-solid {
      background: #dc2626;
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: background 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 140px;
    }

    .btn-danger-solid:disabled {
      background: #fca5a5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #4b5563;
      border: 1px solid #d1d5db;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly memoryService = inject(MemoryService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  readonly activeTab = signal<'memories' | 'security'>('memories');
  readonly taggedMemories = signal<Memory[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isUploadingAvatar = signal<boolean>(false);
  readonly isExportingArchive = signal<boolean>(false);
  readonly isDeletingAccount = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);
  readonly deleteConfirmationInput = signal<string>('');
  readonly defaultPrivacy = signal<PrivacyLevel>(
    (localStorage.getItem('mv_default_privacy_level') as PrivacyLevel) || 'CIRCLE_COMPANIONS'
  );

  readonly defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  ngOnInit(): void {
    this.loadTaggedMemories();
  }

  setDefaultPrivacy(level: PrivacyLevel): void {
    this.defaultPrivacy.set(level);
    localStorage.setItem('mv_default_privacy_level', level);
    const friendlyName = level === 'PRIVATE_TO_ME' ? 'Private to Me' :
                         level === 'CIRCLE_COMPANIONS' ? 'Circle Companions' : 'Public Archive';
    this.snackBar.open(`Default privacy saved: ${friendlyName}`, 'OK', { duration: 3000 });
  }

  downloadFullArchive(): void {
    this.isExportingArchive.set(true);
    this.userService.exportFullArchive().subscribe({
      next: (blob) => {
        this.isExportingArchive.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memoryverse-archive-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Archive downloaded successfully!', 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.isExportingArchive.set(false);
        console.error('Failed to export archive:', err);
        this.snackBar.open('Failed to generate archive. Please try again.', 'Close', { duration: 4500 });
      }
    });
  }

  confirmDeleteAccount(): void {
    if (this.deleteConfirmationInput().trim().toUpperCase() !== 'DELETE') {
      return;
    }
    this.isDeletingAccount.set(true);
    this.userService.deleteMyAccount().subscribe({
      next: () => {
        this.isDeletingAccount.set(false);
        this.snackBar.open('Your account has been deleted. We are sorry to see you go.', 'Close', { duration: 5000 });
        this.auth.logout();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isDeletingAccount.set(false);
        console.error('Failed to delete account:', err);
        this.snackBar.open('Failed to delete account. Please try again later.', 'Close', { duration: 4500 });
      }
    });
  }

  onAvatarFileSelected(event: Event, userId: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.isUploadingAvatar.set(true);
    this.userService.uploadAvatar(userId, file).subscribe({
      next: (updatedUser) => {
        this.isUploadingAvatar.set(false);
        this.auth.updateCurrentUser(updatedUser);
        this.snackBar.open('Profile photo updated successfully!', 'OK', { duration: 3500 });
        input.value = '';
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        console.error('Failed to update avatar:', err);
        const msg = err.error?.message || 'Failed to upload profile photo. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        input.value = '';
      }
    });
  }

  private loadTaggedMemories(): void {
    this.isLoading.set(true);
    this.memoryService.getTaggedMemories().subscribe({
      next: (res) => {
        this.taggedMemories.set(res.content);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tagged memories:', err);
        this.isLoading.set(false);
      }
    });
  }
}
