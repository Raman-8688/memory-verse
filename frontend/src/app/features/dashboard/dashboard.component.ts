import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { AuthService } from '@core/auth/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { DashboardResponse, TimelineMilestone } from '@core/models/dashboard.model';
import { Memory } from '@core/models/memory.model';

@Component({
  selector: 'mv-dashboard',
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
    <div class="dashboard-container">

      <!-- 1. Editorial Masthead & Personalized Greeting -->
      <section class="editorial-masthead">
        <div class="masthead-topline">
          <span class="magazine-issue">MemoryVerse Journal • Group Archive</span>
          <span class="current-date">{{ formattedToday }}</span>
        </div>

        <h1 class="welcome-heading">
          Welcome back, <span class="highlight-name">{{ authService.currentUser()?.fullName || 'Friend' }}</span>.
        </h1>

        <p class="masthead-quote">
          "The years pass and the roads diverge, but these moments remain frozen in light."
        </p>

        <!-- Editorial Stats Ribbon (Integrated as narrative, NOT boring admin squares) -->
        @if (dashboardData(); as data) {
          <div class="editorial-stats-ribbon">
            <span class="stat-pill">
              <mat-icon>auto_stories</mat-icon>
              <strong>{{ data.stats.totalJourneys }}</strong> {{ data.stats.totalJourneys === 1 ? 'Journey' : 'Journeys' }}
            </span>
            <span class="ribbon-dot">•</span>
            <span class="stat-pill">
              <mat-icon>favorite</mat-icon>
              <strong>{{ data.stats.totalMemories }}</strong> Memories
            </span>
            <span class="ribbon-dot">•</span>
            <span class="stat-pill">
              <mat-icon>photo</mat-icon>
              <strong>{{ data.stats.totalPhotos }}</strong> Photographs
            </span>
            <span class="ribbon-dot">•</span>
            <span class="stat-pill">
              <mat-icon>videocam</mat-icon>
              <strong>{{ data.stats.totalVideos }}</strong> Videos
            </span>
            <span class="ribbon-dot">•</span>
            <span class="stat-pill">
              <mat-icon>groups</mat-icon>
              <strong>{{ data.stats.totalFriends }}</strong> Friends
            </span>
          </div>
        }
      </section>

      <!-- Loading Skeleton State -->
      @if (isLoading()) {
        <div class="skeleton-wrapper">
          <div class="skeleton-hero"></div>
          <div class="skeleton-row">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
        </div>
      } @else {
        @if (dashboardData(); as data) {
          <!-- 2. "Memory of the Day" Emotional Hero Showcase -->
        @if (data.memoryOfTheDay; as motd) {
          <section class="motd-hero-section">
            <div class="motd-card">
              <!-- Cover Visual -->
              <div class="motd-media-pane">
                <img [src]="getCoverUrl(motd)" [alt]="motd.title" mvFallback class="motd-img">
                <div class="motd-overlay"></div>
                <div class="motd-context-badge">
                  <mat-icon>auto_awesome</mat-icon>
                  <span>{{ data.memoryOfTheDayContext || 'Memory of the Day' }}</span>
                </div>
              </div>

              <!-- Emotional Story Pane -->
              <div class="motd-story-pane">
                <div class="motd-meta-row">
                  <span class="motd-date-badge">
                    <mat-icon>calendar_today</mat-icon>
                    {{ formatDate(motd.memoryDate) }}
                  </span>
                  @if (motd.locationName) {
                    <span class="motd-location-badge">
                      <mat-icon>place</mat-icon>
                      {{ motd.locationName }}
                    </span>
                  }
                  <span class="motd-journey-badge">
                    <mat-icon>explore</mat-icon>
                    {{ motd.journeyTitle || 'College Days' }}
                  </span>
                </div>

                <h2 class="motd-title">{{ motd.title }}</h2>

                <div class="motd-quote-box">
                  <p class="motd-story-excerpt">"{{ motd.story }}"</p>
                </div>

                <div class="motd-footer">
                  <div class="motd-creator">
                    <img [src]="motd.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'" 
                         [alt]="motd.createdBy.fullName" 
                         mvFallback
                         class="motd-avatar">
                    <div class="motd-author-info">
                      <span class="by-label">Narrated by</span>
                      <span class="author-name">{{ motd.createdBy.fullName }}</span>
                    </div>
                  </div>

                  <a mat-flat-button class="relive-btn" [routerLink]="['/memories', motd.id]">
                    <ng-container>
                      <mat-icon>play_circle</mat-icon>
                      <span>Relive This Memory</span>
                    </ng-container>
                  </a>
                </div>
              </div>
            </div>
          </section>
        }

        <!-- 3. Journey Timeline Rail (Horizontal Scroll) -->
        @if (data.timeline.length > 0) {
          <section class="timeline-section">
            <div class="section-header-row">
              <div>
                <span class="section-overline">Chronology</span>
                <h2 class="section-title">The Journey Rail</h2>
                <p class="section-subtitle">A chronological timeline through the defining chapters of our bond.</p>
              </div>
              <div class="timeline-scroll-hints">
                <button mat-icon-button (click)="scrollTimeline(-320)" aria-label="Scroll left">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <button mat-icon-button (click)="scrollTimeline(320)" aria-label="Scroll right">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </div>

            <!-- Horizontal Track -->
            <div class="timeline-track" #timelineTrack>
              @for (milestone of data.timeline; track milestone.periodTitle + $index) {
                <div class="milestone-card" [routerLink]="['/journeys', milestone.journeyId]">
                  <div class="milestone-media">
                    <img [src]="milestone.coverImageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80'" 
                         [alt]="milestone.periodTitle" 
                         loading="lazy" 
                         mvFallback
                         class="milestone-img">
                    <div class="milestone-overlay"></div>
                    <span class="milestone-year">{{ milestone.year }}</span>
                  </div>

                  <div class="milestone-content">
                    <h3 class="milestone-title">{{ milestone.periodTitle }}</h3>
                    <p class="milestone-desc">{{ milestone.description || 'A chapter in our shared history.' }}</p>
                    <span class="milestone-link">
                      <span>Explore Chapter</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </span>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- 4. Recent Memories Stream -->
        @if (data.recentMemories.length > 0) {
          <section class="recent-memories-section">
            <div class="section-header-row">
              <div>
                <span class="section-overline">Recent Moments</span>
                <h2 class="section-title">Fresh Memories Stream</h2>
                <p class="section-subtitle">Moments recently preserved and shared by the group.</p>
              </div>
              <a mat-button class="view-all-link" routerLink="/memories">
                <ng-container>
                  <span>Explore all {{ data.stats.totalMemories }} moments</span>
                  <mat-icon>arrow_forward</mat-icon>
                </ng-container>
              </a>
            </div>

            <div class="recent-grid">
              @for (memory of data.recentMemories; track memory.id) {
                <article class="recent-card" [routerLink]="['/memories', memory.id]">
                  <div class="recent-media">
                    <img [src]="getCoverUrl(memory)" [alt]="memory.title" loading="lazy" mvFallback class="recent-img">
                    <div class="recent-overlay"></div>
                    <span class="recent-date">{{ formatDate(memory.memoryDate) }}</span>
                  </div>

                  <div class="recent-content">
                    <span class="recent-journey-tag">{{ memory.journeyTitle || 'Journey' }}</span>
                    <h3 class="recent-title">{{ memory.title }}</h3>
                    <p class="recent-story">{{ memory.story }}</p>
                    
                    <div class="recent-footer">
                      <div class="recent-author">
                        <img [src]="memory.createdBy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'" 
                             [alt]="memory.createdBy.fullName" 
                             mvFallback
                             class="recent-avatar">
                        <span>{{ memory.createdBy.fullName }}</span>
                      </div>
                      <span class="read-more">Read story &rarr;</span>
                    </div>
                  </div>
                </article>
              }
            </div>
          </section>
        }

        } @else {
          <!-- Empty State -->
          <div class="dashboard-empty-state">
            <div class="empty-icon-wrap">
              <mat-icon>auto_stories</mat-icon>
            </div>
            <h2 class="editorial-title">Our Story Begins Here</h2>
            <p>We haven't recorded our first memory yet. Let's capture the first moment together.</p>
            <a mat-flat-button color="primary" routerLink="/memories/new">
              <ng-container>
                <mat-icon>add</mat-icon>
                <span>Add Our First Memory</span>
              </ng-container>
            </a>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding-bottom: var(--space-8);
    }

    /* 1. Editorial Masthead */
    .editorial-masthead {
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--mv-border);
    }

    .masthead-topline {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-2);
    }

    .magazine-issue {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--mv-primary);
    }

    .current-date {
      font-size: 0.8rem;
      color: var(--mv-text-muted);
      font-weight: 500;
    }

    .welcome-heading {
      font-family: var(--font-editorial);
      font-size: 3.2rem;
      font-weight: 700;
      margin: 0 0 var(--space-2) 0;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--mv-text-primary);
    }

    .highlight-name {
      color: var(--mv-primary);
      font-style: italic;
    }

    .masthead-quote {
      font-family: var(--font-editorial);
      font-size: 1.25rem;
      font-style: italic;
      color: var(--mv-text-secondary);
      margin: 0 0 var(--space-4) 0;
      max-width: 650px;
      line-height: 1.5;
    }

    .editorial-stats-ribbon {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      padding: 10px 16px;
      border-radius: var(--radius-full);
      width: fit-content;
      box-shadow: var(--shadow-subtle);
    }

    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: var(--mv-text-secondary);
    }

    .stat-pill mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mv-primary);
    }

    .stat-pill strong {
      color: var(--mv-text-primary);
      font-weight: 700;
    }

    .ribbon-dot {
      color: var(--mv-border);
    }

    /* 2. Memory of the Day Hero Showcase */
    .motd-hero-section {
      width: 100%;
    }

    .motd-card {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      min-height: 440px;
      transition: box-shadow 0.3s ease;
    }

    .motd-card:hover {
      box-shadow: var(--shadow-hover);
    }

    .motd-media-pane {
      position: relative;
      background-color: #000000;
      overflow: hidden;
      min-height: 350px;
    }

    .motd-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }

    .motd-card:hover .motd-img {
      transform: scale(1.03);
    }

    .motd-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%);
    }

    .motd-context-badge {
      position: absolute;
      top: 16px;
      left: 16px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(180, 83, 9, 0.9);
      backdrop-filter: blur(8px);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .motd-context-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .motd-story-pane {
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(135deg, #ffffff 0%, var(--mv-bg-subtle) 100%);
    }

    .motd-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: var(--space-3);
    }

    .motd-date-badge, .motd-location-badge, .motd-journey-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      color: var(--mv-text-secondary);
    }

    .motd-date-badge mat-icon, .motd-location-badge mat-icon, .motd-journey-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mv-primary);
    }

    .motd-journey-badge {
      background-color: #fef3c7;
      border-color: var(--mv-primary);
      color: var(--mv-primary);
    }

    .motd-title {
      font-family: var(--font-editorial);
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 var(--space-3) 0;
      color: var(--mv-text-primary);
      letter-spacing: -0.01em;
    }

    .motd-quote-box {
      border-left: 3px solid var(--mv-primary);
      padding-left: 14px;
      margin-bottom: var(--space-4);
    }

    .motd-story-excerpt {
      font-family: var(--font-editorial);
      font-size: 1.15rem;
      font-style: italic;
      color: var(--mv-text-secondary);
      line-height: 1.6;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .motd-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: var(--space-3);
      border-top: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: 12px;
    }

    .motd-creator {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .motd-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--mv-primary);
    }

    .motd-author-info {
      display: flex;
      flex-direction: column;
    }

    .by-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mv-text-muted);
    }

    .author-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--mv-text-primary);
    }

    .relive-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      padding: 0 20px;
      height: 42px;
      border-radius: var(--radius-md);
      box-shadow: 0 2px 8px rgba(180, 83, 9, 0.25);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Section Headers */
    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--mv-border);
    }

    .section-overline {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .section-title {
      font-family: var(--font-editorial);
      font-size: 2rem;
      font-weight: 700;
      margin: 2px 0 4px 0;
      color: var(--mv-text-primary);
    }

    .section-subtitle {
      color: var(--mv-text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }

    .timeline-scroll-hints {
      display: flex;
      gap: 6px;
    }

    .view-all-link {
      color: var(--mv-primary) !important;
      font-weight: 600;
      font-size: 0.88rem;
    }

    /* 3. Timeline Horizontal Track */
    .timeline-track {
      display: flex;
      gap: var(--space-4);
      overflow-x: auto;
      padding-bottom: 14px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }

    .milestone-card {
      min-width: 280px;
      max-width: 280px;
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      cursor: pointer;
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }

    .milestone-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-card);
      border-color: var(--mv-border-focus);
    }

    .milestone-media {
      position: relative;
      height: 150px;
      background-color: #000000;
      overflow: hidden;
    }

    .milestone-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .milestone-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%);
    }

    .milestone-year {
      position: absolute;
      bottom: 10px;
      left: 12px;
      font-family: var(--font-editorial);
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.05em;
    }

    .milestone-content {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .milestone-title {
      font-family: var(--font-editorial);
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: var(--mv-text-primary);
    }

    .milestone-desc {
      font-size: 0.82rem;
      color: var(--mv-text-secondary);
      line-height: 1.4;
      margin: 0 0 12px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .milestone-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--mv-primary);
    }

    .milestone-link mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* 4. Recent Memories Grid */
    .recent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }

    .recent-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--mv-border);
      overflow: hidden;
      cursor: pointer;
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }

    .recent-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: var(--mv-border-focus);
    }

    .recent-media {
      position: relative;
      height: 180px;
      background-color: #1c1917;
      overflow: hidden;
    }

    .recent-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .recent-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%);
    }

    .recent-date {
      position: absolute;
      bottom: 10px;
      left: 12px;
      font-size: 0.72rem;
      color: #ffffff;
      font-weight: 600;
      background: rgba(28, 25, 23, 0.65);
      backdrop-filter: blur(4px);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .recent-content {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .recent-journey-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .recent-title {
      font-family: var(--font-editorial);
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: var(--mv-text-primary);
    }

    .recent-story {
      font-size: 0.85rem;
      color: var(--mv-text-secondary);
      line-height: 1.5;
      margin: 0 0 12px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .recent-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--mv-border);
      padding-top: 8px;
    }

    .recent-author {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: var(--mv-text-muted);
    }

    .recent-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
    }

    .read-more {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--mv-primary);
    }

    /* Skeletons & Empty State */
    .skeleton-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .skeleton-hero {
      height: 400px;
      border-radius: var(--radius-lg);
      background: linear-gradient(90deg, #f0eee9 25%, #e6e3dc 50%, #f0eee9 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }

    .skeleton-row {
      display: flex;
      gap: var(--space-4);
    }

    .skeleton-card {
      flex: 1;
      height: 200px;
      border-radius: var(--radius-md);
      background: #f0eee9;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .dashboard-empty-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fef3c7;
      color: var(--mv-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    @media (max-width: 900px) {
      .motd-card {
        grid-template-columns: 1fr;
      }
      .motd-media-pane {
        height: 240px;
      }
      .welcome-heading {
        font-size: 2.4rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly isLoading = signal<boolean>(true);

  readonly formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard:', err);
        this.isLoading.set(false);
      }
    });
  }

  getCoverUrl(memory: Memory): string {
    if (memory.mediaList && memory.mediaList.length > 0) {
      return memory.mediaList[0].thumbnailUrl || memory.mediaList[0].mediaUrl;
    }
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  scrollTimeline(offset: number): void {
    const el = document.querySelector('.timeline-track');
    if (el) {
      el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }
}
