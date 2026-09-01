import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { MemoryService } from '@core/services/memory.service';
import { Memory } from '@core/models/memory.model';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';

@Component({
  selector: 'mv-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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

      <!-- Tagged Memories Section -->
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
  `]
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly memoryService = inject(MemoryService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  readonly taggedMemories = signal<Memory[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isUploadingAvatar = signal<boolean>(false);
  readonly defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  ngOnInit(): void {
    this.loadTaggedMemories();
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
