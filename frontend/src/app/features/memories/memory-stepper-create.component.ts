import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Journey, JourneySection } from '@core/models/journey.model';
import { User } from '@core/models/user.model';
import { JourneyService } from '@core/services/journey.service';
import { UserService } from '@core/services/user.service';
import { MemoryService } from '@core/services/memory.service';
import { MemoryCreateDto } from '@core/models/memory.model';

interface PreviewMedia {
  file?: File;
  previewUrl: string;
  name: string;
  size: string;
  isVideo: boolean;
  isAudio?: boolean;
}

@Component({
  selector: 'mv-memory-stepper-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="stepper-page">
      <!-- Header -->
      <div class="stepper-header">
        <a routerLink="/memories" class="back-link">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Memories</span>
        </a>
        <div class="title-group">
          <span class="sub-label">Preserve a Moment</span>
          <h1 class="editorial-title">Add to Our Story</h1>
          <p class="subtitle">Take a moment to describe, organize, and share this memory with everyone.</p>
        </div>
      </div>

      <!-- Stepper Container -->
      <div class="stepper-card">
        <mat-stepper [linear]="true" #stepper class="editorial-stepper">

          <!-- STEP 1: The Story -->
          <mat-step [stepControl]="storyForm">
            <ng-template matStepLabel>The Story</ng-template>
            <div class="step-content">
              <div class="step-intro">
                <h2 class="step-heading">Tell the Story</h2>
                <p class="step-sub">What happened? Give this moment a meaningful title and describe the emotions, laughs, or adventure.</p>
              </div>

              <form [formGroup]="storyForm" class="step-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Memory Title</mat-label>
                  <input matInput formControlName="title" placeholder="e.g. Midnight Chai at the Tapri before Finals">
                  <mat-icon matPrefix class="field-icon">title</mat-icon>
                  @if (storyForm.get('title')?.hasError('required') && storyForm.get('title')?.touched) {
                    <mat-error>Title is required</mat-error>
                  }
                </mat-form-field>

                <div class="two-col">
                  <mat-form-field appearance="outline">
                    <mat-label>Date of Memory</mat-label>
                    <input matInput formControlName="memoryDate" type="date">
                    <mat-icon matPrefix class="field-icon">event</mat-icon>
                    @if (storyForm.get('memoryDate')?.hasError('required') && storyForm.get('memoryDate')?.touched) {
                      <mat-error>Date is required</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Location / Venue</mat-label>
                    <input matInput formControlName="locationName" placeholder="e.g. Vagator Beach, Goa or CS Lab 3">
                    <mat-icon matPrefix class="field-icon">place</mat-icon>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>The Full Story & Narrative</mat-label>
                  <textarea matInput formControlName="story" rows="4" placeholder="Write the memory as you remember it. What made this moment unforgettable?"></textarea>
                  <mat-icon matPrefix class="field-icon">auto_stories</mat-icon>
                  @if (storyForm.get('story')?.hasError('required') && storyForm.get('story')?.touched) {
                    <mat-error>Please write at least a brief story or description</mat-error>
                  }
                </mat-form-field>

                <div class="stepper-nav-buttons">
                  <div></div>
                  <button mat-flat-button class="next-btn" matStepperNext [disabled]="storyForm.invalid">
                    <ng-container>
                      <span>Organization</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </ng-container>
                  </button>
                </div>
              </form>
            </div>
          </mat-step>

          <!-- STEP 2: Organization -->
          <mat-step [stepControl]="orgForm">
            <ng-template matStepLabel>Organization</ng-template>
            <div class="step-content">
              <div class="step-intro">
                <h2 class="step-heading">Where Does This Belong?</h2>
                <p class="step-sub">Connect this memory to a broader life journey and specific chapter.</p>
              </div>

              <form [formGroup]="orgForm" class="step-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Select Journey</mat-label>
                  <mat-select formControlName="journeyId" (selectionChange)="onJourneySelected($event.value)">
                    @for (journey of journeys(); track journey.id) {
                      <mat-option [value]="journey.id">{{ journey.title }}</mat-option>
                    }
                  </mat-select>
                  <mat-icon matPrefix class="field-icon">explore</mat-icon>
                  @if (orgForm.get('journeyId')?.hasError('required') && orgForm.get('journeyId')?.touched) {
                    <mat-error>Please select a journey</mat-error>
                  }
                </mat-form-field>

                @if (selectedJourneySections().length > 0) {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Select Chapter / Section (Optional)</mat-label>
                    <mat-select formControlName="sectionId">
                      <mat-option [value]="null">General / No Specific Chapter</mat-option>
                      @for (section of selectedJourneySections(); track section.id) {
                        <mat-option [value]="section.id">{{ section.title }}</mat-option>
                      }
                    </mat-select>
                    <mat-icon matPrefix class="field-icon">bookmark_border</mat-icon>
                  </mat-form-field>
                }

                <div class="stepper-nav-buttons">
                  <button mat-button matStepperPrevious>
                    <ng-container>
                      <mat-icon>arrow_back</mat-icon>
                      <span>Story</span>
                    </ng-container>
                  </button>
                  <button mat-flat-button class="next-btn" matStepperNext [disabled]="orgForm.invalid">
                    <ng-container>
                      <span>Media Files</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </ng-container>
                  </button>
                </div>
              </form>
            </div>
          </mat-step>

          <!-- STEP 3: Media Upload -->
          <mat-step>
            <ng-template matStepLabel>Media</ng-template>
            <div class="step-content">
              <div class="step-intro">
                <h2 class="step-heading">Photos, Videos & Audio Notes</h2>
                <p class="step-sub">Upload photographs, MP4 videos, or voice memos (max 50MB). You can review previews before publishing.</p>
              </div>

              <!-- Drag and Drop Dropzone -->
              <div class="dropzone" (click)="fileInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
                <input #fileInput type="file" multiple accept="image/*,video/*,audio/*" (change)="onFilesSelected($event)" style="display: none">
                <div class="dropzone-icon">
                  <mat-icon>cloud_upload</mat-icon>
                </div>
                <div class="dropzone-text">
                  <strong>Click to browse files</strong> or drag and drop here
                </div>
                <div class="dropzone-limits">
                  Supports JPG, PNG, WEBP, MP4 videos, and MP3/WAV/M4A audio notes up to 50MB
                </div>
              </div>

              @if (mediaErrorMessage()) {
                <div class="error-pill">
                  <mat-icon>warning</mat-icon>
                  <span>{{ mediaErrorMessage() }}</span>
                </div>
              }

              <!-- Previews Grid -->
              @if (selectedMedia().length > 0) {
                <div class="previews-container">
                  <div class="previews-title">Selected Assets ({{ selectedMedia().length }})</div>
                  <div class="previews-grid">
                    @for (item of selectedMedia(); track $index; let i = $index) {
                      <div class="preview-tile">
                        @if (item.isVideo) {
                          <video [src]="item.previewUrl" class="preview-media" controls></video>
                          <span class="media-type-pill video">
                            <mat-icon>videocam</mat-icon> Video
                          </span>
                        } @else if (item.isAudio) {
                          <div class="preview-media preview-audio-box">
                            <mat-icon class="audio-icon">mic</mat-icon>
                            <span class="audio-name">{{ item.name }}</span>
                          </div>
                          <span class="media-type-pill audio">
                            <mat-icon>mic</mat-icon> Audio
                          </span>
                        } @else {
                          <img [src]="item.previewUrl" [alt]="item.name" class="preview-media">
                          <span class="media-type-pill image">
                            <mat-icon>photo</mat-icon> Photo
                          </span>
                        }
                        <button type="button" class="remove-btn" (click)="removeMedia(i)">
                          <mat-icon>close</mat-icon>
                        </button>
                        <div class="preview-info">{{ item.name }} ({{ item.size }})</div>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="stepper-nav-buttons">
                <button mat-button matStepperPrevious>
                  <ng-container>
                    <mat-icon>arrow_back</mat-icon>
                    <span>Organization</span>
                  </ng-container>
                </button>
                <button mat-flat-button class="next-btn" matStepperNext>
                  <ng-container>
                    <span>Tag Friends</span>
                    <mat-icon>arrow_forward</mat-icon>
                  </ng-container>
                </button>
              </div>
            </div>
          </mat-step>

          <!-- STEP 4: Tag Friends -->
          <mat-step>
            <ng-template matStepLabel>Tag Friends</ng-template>
            <div class="step-content">
              <div class="step-intro">
                <h2 class="step-heading">Who was there?</h2>
                <p class="step-sub">Tag friends who shared this moment. It will appear on their profiles and journeys.</p>
              </div>

              <div class="friends-picker">
                @for (user of users(); track user.id) {
                  <div class="friend-chip" 
                       [class.selected]="isUserTagged(user.id)"
                       (click)="toggleTagUser(user)">
                    <img [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'" 
                         [alt]="user.fullName" 
                         class="friend-avatar">
                    <span class="friend-name">{{ user.fullName }}</span>
                    <mat-icon class="check-icon">
                      {{ isUserTagged(user.id) ? 'check_circle' : 'add_circle_outline' }}
                    </mat-icon>
                  </div>
                }
              </div>

              <div class="stepper-nav-buttons">
                <button mat-button matStepperPrevious>
                  <ng-container>
                    <mat-icon>arrow_back</mat-icon>
                    <span>Media</span>
                  </ng-container>
                </button>
                <button mat-flat-button class="next-btn" matStepperNext>
                  <ng-container>
                    <span>Review & Publish</span>
                    <mat-icon>arrow_forward</mat-icon>
                  </ng-container>
                </button>
              </div>
            </div>
          </mat-step>

          <!-- STEP 5: Preview & Publish -->
          <mat-step>
            <ng-template matStepLabel>Preview & Publish</ng-template>
            <div class="step-content">
              <div class="step-intro">
                <h2 class="step-heading">Ready to Share</h2>
                <p class="step-sub">Here is how this memory will be preserved in MemoryVerse.</p>
              </div>

              <!-- Live Card Preview -->
              <div class="summary-card">
                @if (selectedMedia().length > 0) {
                  <div class="summary-hero-media">
                    @if (selectedMedia()[0].isVideo) {
                      <video [src]="selectedMedia()[0].previewUrl" class="summary-img" controls></video>
                    } @else {
                      <img [src]="selectedMedia()[0].previewUrl" [alt]="storyForm.value.title" class="summary-img">
                    }
                    @if (selectedMedia().length > 1) {
                      <span class="media-count-badge">+{{ selectedMedia().length - 1 }} more assets</span>
                    }
                  </div>
                }

                <div class="summary-body">
                  <div class="summary-meta">
                    <span class="meta-pill">
                      <mat-icon>event</mat-icon>
                      {{ storyForm.value.memoryDate || 'Undated' }}
                    </span>
                    @if (storyForm.value.locationName) {
                      <span class="meta-pill">
                        <mat-icon>place</mat-icon>
                        {{ storyForm.value.locationName }}
                      </span>
                    }
                    <span class="meta-pill journey-pill">
                      <mat-icon>explore</mat-icon>
                      {{ selectedJourneyTitle() }}
                    </span>
                  </div>

                  <h3 class="summary-title">{{ storyForm.value.title || 'Untitled Memory' }}</h3>
                  <p class="summary-story">{{ storyForm.value.story || 'No story details provided.' }}</p>

                  @if (taggedFriendsList().length > 0) {
                    <div class="summary-tagged">
                      <span class="tagged-label">With:</span>
                      <div class="avatar-stack">
                        @for (friend of taggedFriendsList(); track friend.id) {
                          <span class="tagged-friend-name">{{ friend.fullName }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="stepper-nav-buttons publish-actions">
                <button mat-button matStepperPrevious [disabled]="isPublishing()">
                  <ng-container>
                    <mat-icon>arrow_back</mat-icon>
                    <span>Edit Details</span>
                  </ng-container>
                </button>
                <button mat-flat-button class="publish-btn" (click)="publishMemory()" [disabled]="storyForm.invalid || orgForm.invalid || isPublishing()">
                  @if (isPublishing()) {
                    <ng-container>
                      <mat-spinner diameter="20"></mat-spinner>
                      <span>Uploading & Publishing...</span>
                    </ng-container>
                  } @else {
                    <ng-container>
                      <mat-icon>favorite</mat-icon>
                      <span>Publish Memory to Verse</span>
                    </ng-container>
                  }
                </button>
              </div>
            </div>
          </mat-step>

        </mat-stepper>
      </div>
    </div>
  `,
  styles: [`
    .stepper-page {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding-bottom: var(--space-8);
    }

    .stepper-header {
      margin-bottom: var(--space-2);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--mv-text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      margin-bottom: var(--space-2);
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--mv-primary);
    }

    .sub-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.4rem;
      margin: 2px 0 6px 0;
    }

    .subtitle {
      color: var(--mv-text-secondary);
      margin: 0;
      font-size: 0.95rem;
    }

    .stepper-card {
      background-color: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }

    .step-content {
      padding: var(--space-4) var(--space-3);
    }

    .step-intro {
      margin-bottom: var(--space-4);
    }

    .step-heading {
      font-family: var(--font-editorial);
      font-size: 1.6rem;
      margin: 0 0 4px 0;
      color: var(--mv-text-primary);
    }

    .step-sub {
      color: var(--mv-text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }

    .step-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .full-width {
      width: 100%;
    }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .field-icon {
      color: var(--mv-text-muted);
      margin-right: 8px;
    }

    .stepper-nav-buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--space-4);
      padding-top: var(--space-3);
      border-top: 1px solid var(--mv-border);
    }

    .next-btn, .publish-btn {
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .publish-btn {
      height: 48px;
      padding: 0 28px;
      font-size: 1rem;
      border-radius: var(--radius-md);
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.3);
    }

    .dropzone {
      border: 2px dashed var(--mv-border-focus);
      border-radius: var(--radius-md);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      background-color: var(--mv-bg-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .dropzone:hover {
      border-color: var(--mv-primary);
      background-color: #fef3c7;
    }

    .dropzone-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mv-primary);
      margin-bottom: 8px;
    }

    .dropzone-text {
      font-size: 0.95rem;
      color: var(--mv-text-primary);
      margin-bottom: 4px;
    }

    .dropzone-limits {
      font-size: 0.78rem;
      color: var(--mv-text-muted);
    }

    .error-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--mv-danger);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      margin-top: 12px;
    }

    .previews-container {
      margin-top: var(--space-4);
    }

    .previews-title {
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--mv-text-secondary);
    }

    .previews-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    .preview-tile {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--mv-border);
      height: 120px;
      background-color: #000000;
    }

    .preview-media {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-type-pill {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      gap: 2px;
      color: #ffffff;
    }

    .media-type-pill.image {
      background-color: rgba(28, 25, 23, 0.75);
    }

    .media-type-pill.video {
      background-color: #b91c1c;
    }

    .media-type-pill.audio {
      background-color: var(--mv-primary);
    }

    .preview-audio-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--mv-bg-subtle);
      color: var(--mv-primary);
      padding: 12px;
      text-align: center;
      gap: 6px;

      .audio-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .audio-name {
        font-size: 0.7rem;
        color: var(--mv-text-secondary);
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .media-type-pill mat-icon {
      font-size: 10px;
      width: 10px;
      height: 10px;
    }

    .remove-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .remove-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .preview-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 4px;
      font-size: 0.65rem;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.65);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .friends-picker {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .friend-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .friend-chip:hover {
      border-color: var(--mv-primary);
      background-color: #fef3c7;
    }

    .friend-chip.selected {
      border-color: var(--mv-primary);
      background-color: #fef3c7;
    }

    .friend-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .friend-name {
      flex: 1;
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--mv-text-primary);
    }

    .check-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mv-primary);
    }

    .summary-card {
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      margin-bottom: var(--space-4);
    }

    .summary-hero-media {
      position: relative;
      height: 280px;
      width: 100%;
      background-color: #000000;
    }

    .summary-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-count-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .summary-body {
      padding: var(--space-4);
    }

    .summary-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      color: var(--mv-text-secondary);
    }

    .meta-pill mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--mv-primary);
    }

    .journey-pill {
      background-color: #fef3c7;
      border-color: var(--mv-primary);
      color: var(--mv-primary);
    }

    .summary-title {
      font-family: var(--font-editorial);
      font-size: 1.8rem;
      margin: 0 0 10px 0;
      color: var(--mv-text-primary);
    }

    .summary-story {
      color: var(--mv-text-secondary);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: var(--space-3);
    }

    .summary-tagged {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid var(--mv-border);
    }

    .tagged-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--mv-text-muted);
    }

    .tagged-friend-name {
      display: inline-block;
      font-size: 0.78rem;
      background: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      color: var(--mv-text-primary);
      margin-right: 6px;
    }

    @media (max-width: 640px) {
      .stepper-page {
        padding: var(--space-2);
        max-width: 100%;
        overflow-x: hidden;
      }
      .stepper-card {
        border-radius: var(--radius-md);
      }
      .step-content {
        padding: var(--space-3) var(--space-2);
      }
      .two-col {
        grid-template-columns: 1fr;
        gap: var(--space-2);
      }
      .summary-hero-media {
        height: 200px;
      }
      .step-actions {
        flex-direction: column-reverse;
        gap: 8px;
        button {
          width: 100%;
        }
      }
      .editorial-title {
        font-size: 1.8rem;
      }
    }
  `]
})
export class MemoryStepperCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly journeyService = inject(JourneyService);
  private readonly userService = inject(UserService);
  private readonly memoryService = inject(MemoryService);
  private readonly router = inject(Router);

  readonly journeys = signal<Journey[]>([]);
  readonly users = signal<User[]>([]);
  readonly selectedJourneySections = signal<JourneySection[]>([]);
  readonly selectedMedia = signal<PreviewMedia[]>([]);
  readonly taggedUserIds = signal<string[]>([]);
  readonly mediaErrorMessage = signal<string | null>(null);
  readonly isPublishing = signal<boolean>(false);

  readonly storyForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    story: ['', [Validators.required, Validators.minLength(5)]],
    memoryDate: [new Date().toISOString().substring(0, 10), Validators.required],
    locationName: ['']
  });

  readonly orgForm: FormGroup = this.fb.group({
    journeyId: ['', Validators.required],
    sectionId: [null]
  });

  readonly selectedJourneyTitle = computed(() => {
    const id = this.orgForm.get('journeyId')?.value;
    const match = this.journeys().find(j => j.id === id);
    return match ? match.title : 'Journey';
  });

  readonly taggedFriendsList = computed(() => {
    const ids = this.taggedUserIds();
    return this.users().filter(u => ids.includes(u.id));
  });

  ngOnInit(): void {
    this.loadJourneys();
    this.loadUsers();
  }

  loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (data) => {
        this.journeys.set(data);
        if (data.length > 0 && !this.orgForm.get('journeyId')?.value) {
          this.orgForm.patchValue({ journeyId: data[0].id });
          this.onJourneySelected(data[0].id);
        }
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => this.users.set(data)
    });
  }

  onJourneySelected(journeyId: string): void {
    const journey = this.journeys().find(j => j.id === journeyId);
    this.selectedJourneySections.set(journey?.sections || []);
    this.orgForm.patchValue({ sectionId: null });
  }

  onFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.handleFiles(Array.from(target.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    this.mediaErrorMessage.set(null);
    const updated = [...this.selectedMedia()];

    for (const file of files) {
      const isVideo = file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4');
      const isAudio = file.type.startsWith('audio') || !!file.name.toLowerCase().match(/\.(mp3|wav|m4a|aac|ogg|weba)$/);

      // Video constraint: Max 50MB and MP4 format only
      if (isVideo) {
        if (file.size > 50 * 1024 * 1024) {
          this.mediaErrorMessage.set(`Video "${file.name}" exceeds 50MB limit.`);
          continue;
        }
        if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
          this.mediaErrorMessage.set(`Video "${file.name}" is not in MP4 format.`);
          continue;
        }
      }

      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      updated.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: sizeStr,
        isVideo,
        isAudio
      });
    }

    this.selectedMedia.set(updated);
  }

  removeMedia(index: number): void {
    const current = [...this.selectedMedia()];
    const removed = current.splice(index, 1);
    if (removed[0]?.previewUrl) {
      URL.revokeObjectURL(removed[0].previewUrl);
    }
    this.selectedMedia.set(current);
  }

  toggleTagUser(user: User): void {
    const current = [...this.taggedUserIds()];
    const idx = current.indexOf(user.id);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(user.id);
    }
    this.taggedUserIds.set(current);
  }

  isUserTagged(userId: string): boolean {
    return this.taggedUserIds().includes(userId);
  }

  publishMemory(): void {
    if (this.storyForm.invalid || this.orgForm.invalid || this.isPublishing()) return;

    this.isPublishing.set(true);

    const dto: MemoryCreateDto = {
      title: this.storyForm.value.title,
      story: this.storyForm.value.story,
      memoryDate: this.storyForm.value.memoryDate,
      locationName: this.storyForm.value.locationName,
      journeyId: this.orgForm.value.journeyId,
      sectionId: this.orgForm.value.sectionId || undefined,
      taggedUserIds: this.taggedUserIds(),
      isFeatured: false
    };

    const filesToUpload = this.selectedMedia()
      .map(m => m.file)
      .filter((f): f is File => !!f);

    this.memoryService.createMemory(dto, filesToUpload).subscribe({
      next: (created) => {
        this.isPublishing.set(false);
        this.router.navigate(['/memories', created.id]);
      },
      error: (err) => {
        this.isPublishing.set(false);
        console.error('Failed to create memory:', err);
      }
    });
  }
}
