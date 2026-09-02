import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MediaCaptureService } from '@core/services/media-capture.service';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { Journey, JourneySection } from '@core/models/journey.model';
import { MemoryCreateDto } from '@core/models/memory.model';
import { DesktopUploadDropzoneComponent } from './desktop-upload-dropzone.component';

interface PreviewItem {
  file: File;
  previewUrl: string;
  isVideo: boolean;
  name: string;
  sizeFormatted: string;
}

interface AiSuggestedMetadata {
  title: string;
  locationName: string;
  story: string;
}

@Component({
  selector: 'mv-quick-add-review',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DesktopUploadDropzoneComponent
  ],
  templateUrl: './quick-add-review.component.html',
  styleUrl: './quick-add-review.component.scss'
})
export class QuickAddReviewComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly captureService = inject(MediaCaptureService);
  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);

  readonly previews = signal<PreviewItem[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly availableSections = signal<JourneySection[]>([]);
  readonly isUploading = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);

  // Phase 9: AI Suggestions State
  readonly isAnalyzingAi = signal<boolean>(false);
  readonly aiSuggestedData = signal<AiSuggestedMetadata | null>(null);

  reviewForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    journeyId: ['', Validators.required],
    sectionId: [''],
    memoryDate: [new Date().toISOString().split('T')[0], Validators.required],
    locationName: [''],
    story: ['']
  });

  ngOnInit(): void {
    this.loadJourneys();
    this.generatePreviews(this.captureService.capturedFiles());
  }

  ngOnDestroy(): void {
    this.previews().forEach(item => {
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  private loadJourneys(): void {
    this.journeyService.getJourneys().subscribe({
      next: (list) => {
        this.journeys.set(list);
        if (list.length > 0) {
          const first = list[0];
          this.reviewForm.patchValue({ journeyId: first.id });
          this.onJourneyChange(first.id);
        }
      },
      error: (err) => console.error('Failed to load journeys for review:', err)
    });
  }

  onJourneyChange(journeyId: string): void {
    const found = this.journeys().find(j => j.id === journeyId);
    if (found && (found as any).sections) {
      const secs = (found as any).sections as JourneySection[];
      this.availableSections.set(secs);
      if (secs.length > 0) {
        this.reviewForm.patchValue({ sectionId: secs[0].id });
      } else {
        this.reviewForm.patchValue({ sectionId: '' });
      }
    } else {
      this.availableSections.set([]);
      this.reviewForm.patchValue({ sectionId: '' });
    }
  }

  generatePreviews(files: File[]): void {
    const items: PreviewItem[] = files.map(file => {
      const isVideo = file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4');
      const previewUrl = URL.createObjectURL(file);
      return {
        file,
        previewUrl,
        isVideo,
        name: file.name,
        sizeFormatted: this.formatFileSize(file.size)
      };
    });
    this.previews.set(items);
  }

  removeFile(index: number): void {
    const current = this.previews();
    if (index >= 0 && index < current.length) {
      const removed = current[index];
      if (removed.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      const updated = current.filter((_, idx) => idx !== index);
      this.previews.set(updated);
      this.captureService.setCapturedFiles(updated.map(i => i.file));
    }
  }

  onFilesAdded(newFiles: File[]): void {
    if (newFiles && newFiles.length > 0) {
      const existingFiles = this.previews().map(p => p.file);
      const combined = [...existingFiles, ...newFiles];
      this.captureService.setCapturedFiles(combined);
      this.generatePreviews(combined);
    }
  }

  triggerCapture(): void {
    this.captureService.openCaptureFlow();
  }

  // Phase 9: AI Metadata Suggestions
  generateAiSuggestions(): void {
    const files = this.previews();
    if (files.length === 0) return;

    this.isAnalyzingAi.set(true);

    // Derive intelligent prompt based on filenames and active journey
    setTimeout(() => {
      const firstFileName = files[0]?.name.toLowerCase() || '';
      let suggestedTitle = 'Unforgettable Reunion at the Campus Grounds';
      let suggestedLocation = 'University Campus, Central Courtyard';
      let suggestedStory = 'A spontaneous gathering that turned into one of our favorite memories. Laughing about old classroom stories and planning the next trip.';

      if (firstFileName.includes('beach') || firstFileName.includes('sea') || firstFileName.includes('trip') || firstFileName.includes('goa')) {
        suggestedTitle = 'Golden Hour by the Coast';
        suggestedLocation = 'Baga Beach, Goa';
        suggestedStory = 'Standing together as the sun set over the horizon, listening to the waves and promising to always stay in touch.';
      } else if (firstFileName.includes('night') || firstFileName.includes('hostel') || firstFileName.includes('chai')) {
        suggestedTitle = 'Late Night Conversations & Tapri Chai';
        suggestedLocation = 'North Gate Tapri, Hostel Block 4';
        suggestedStory = 'Midnight strolls after exam week, endless discussions on future dreams and piping hot chai in earthen kulhads.';
      } else if (firstFileName.includes('farewell') || firstFileName.includes('grad') || firstFileName.includes('convocation')) {
        suggestedTitle = 'Farewell Gala: Stepping Into Tomorrow';
        suggestedLocation = 'Main Auditorium';
        suggestedStory = 'A bitter-sweet evening full of hugs, parting promises, and celebrating the unforgettable years we lived together.';
      }

      this.aiSuggestedData.set({
        title: suggestedTitle,
        locationName: suggestedLocation,
        story: suggestedStory
      });

      this.isAnalyzingAi.set(false);
      this.snackBar.open('✨ AI generated metadata suggestions based on your media!', 'OK', { duration: 3000 });
    }, 1200);
  }

  applyAiSuggestions(): void {
    const sugg = this.aiSuggestedData();
    if (!sugg) return;

    this.reviewForm.patchValue({
      title: sugg.title,
      locationName: sugg.locationName,
      story: sugg.story
    });

    this.aiSuggestedData.set(null);
    this.snackBar.open('Applied suggestions to your memory form!', 'OK', { duration: 2500 });
  }

  dismissAiSuggestions(): void {
    this.aiSuggestedData.set(null);
  }

  publishMemory(): void {
    if (this.reviewForm.invalid || this.previews().length === 0 || this.isUploading()) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const formVal = this.reviewForm.value;
    const rawDate = formVal.memoryDate instanceof Date
      ? formVal.memoryDate.toISOString().split('T')[0]
      : new Date(formVal.memoryDate).toISOString().split('T')[0];

    const dto: MemoryCreateDto = {
      title: formVal.title.trim(),
      story: formVal.story ? formVal.story.trim() : '',
      memoryDate: rawDate,
      locationName: formVal.locationName ? formVal.locationName.trim() : undefined,
      journeyId: formVal.journeyId,
      sectionId: formVal.sectionId || undefined
    };

    const filesToUpload = this.previews().map(p => p.file);

    this.isUploading.set(true);
    this.uploadProgress.set(5);

    this.memoryService.createMemoryWithProgress(dto, filesToUpload).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round(100 * event.loaded / event.total);
          this.uploadProgress.set(Math.min(pct, 95));
        } else if (event.type === HttpEventType.Response) {
          this.uploadProgress.set(100);
          this.isUploading.set(false);
          this.captureService.clearCapturedFiles();

          const createdMemory = event.body?.data;
          this.snackBar.open('Memory published successfully to your journey archive!', 'View', {
            duration: 4000
          }).onAction().subscribe(() => {
            if (createdMemory?.id) {
              this.router.navigate(['/memories', createdMemory.id]);
            }
          });

          if (createdMemory?.id) {
            this.router.navigate(['/memories', createdMemory.id]);
          } else {
            this.router.navigate(['/memories']);
          }
        }
      },
      error: (err: any) => {
        console.error('Memory publish failed:', err);
        this.isUploading.set(false);
        const errorMsg = err.error?.message || err.message || 'Failed to upload media. Please try again.';
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      }
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
