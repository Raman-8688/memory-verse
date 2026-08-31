import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { QuickCaptureBottomSheetComponent } from '../../features/capture/quick-capture-bottom-sheet.component';

@Injectable({
  providedIn: 'root'
})
export class MediaCaptureService {
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly router = inject(Router);

  // In-memory captured File[] signal awaiting preview & publication
  readonly capturedFiles = signal<File[]>([]);

  setCapturedFiles(files: File[]): void {
    this.capturedFiles.set(files);
  }

  clearCapturedFiles(): void {
    this.capturedFiles.set([]);
  }

  openCaptureFlow(): void {
    const ref = this.bottomSheet.open(QuickCaptureBottomSheetComponent, {
      panelClass: 'quick-capture-sheet-panel'
    });

    ref.afterDismissed().subscribe((files: File[] | undefined) => {
      if (files && files.length > 0) {
        console.log(`Successfully captured ${files.length} media file(s) in memory:`, files.map(f => f.name));
        this.setCapturedFiles(files);
        // Transition directly into dedicated quick add review screen
        this.router.navigate(['/capture/review']);
      }
    });
  }
}
