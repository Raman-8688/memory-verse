import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Memory } from '../models/memory.model';
import { GalleryItem } from '../models/gallery.model';
import { MediaViewerModalComponent, MediaViewerData } from '@shared/components/media-viewer-modal.component';

@Injectable({
  providedIn: 'root'
})
export class LightboxService {
  private readonly dialog = inject(MatDialog);

  openForMemory(memory: Memory, startIndex: number = 0): void {
    const items = this.convertMemoryToGalleryItems(memory);
    this.openForItems(items, startIndex);
  }

  openForMemories(memories: Memory[], currentMemoryId?: string): void {
    const allItems: GalleryItem[] = [];
    let startIdx = 0;

    memories.forEach(mem => {
      const items = this.convertMemoryToGalleryItems(mem);
      if (currentMemoryId && mem.id === currentMemoryId && startIdx === 0) {
        startIdx = allItems.length;
      }
      allItems.push(...items);
    });

    this.openForItems(allItems, startIdx);
  }

  openForItems(items: GalleryItem[], startIndex: number = 0): void {
    if (!items || items.length === 0) return;

    const validIndex = Math.max(0, Math.min(startIndex, items.length - 1));

    this.dialog.open(MediaViewerModalComponent, {
      data: {
        items,
        startIndex: validIndex
      } as MediaViewerData,
      panelClass: 'fullscreen-dialog-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false
    });
  }

  private convertMemoryToGalleryItems(memory: Memory): GalleryItem[] {
    if (!memory.mediaList || memory.mediaList.length === 0) {
      return [{
        id: memory.id,
        mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        displayOrder: 0,
        memoryId: memory.id,
        memoryTitle: memory.title,
        memoryDate: memory.memoryDate,
        locationName: memory.locationName,
        journeyTitle: memory.journeyTitle,
        uploader: memory.createdBy,
        taggedUsers: memory.taggedUsers,
        createdAt: memory.createdAt || new Date().toISOString()
      }];
    }

    return memory.mediaList.map((m, idx) => ({
      id: m.id || `${memory.id}-${idx}`,
      mediaUrl: m.mediaUrl,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType,
      fileName: m.fileName,
      displayOrder: m.displayOrder ?? idx,
      memoryId: memory.id,
      memoryTitle: memory.title,
      memoryDate: memory.memoryDate,
      locationName: memory.locationName,
      journeyTitle: memory.journeyTitle,
      uploader: memory.createdBy,
      taggedUsers: memory.taggedUsers,
      createdAt: m.createdAt || memory.createdAt || new Date().toISOString()
    }));
  }
}
