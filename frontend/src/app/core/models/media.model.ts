export interface UploadedMediaResult {
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO';
  publicId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}
