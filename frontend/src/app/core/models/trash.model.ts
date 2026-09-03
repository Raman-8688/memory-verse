export interface TrashItem {
  id: string;
  type: 'MEMORY' | 'JOURNEY';
  title: string;
  description?: string;
  thumbnailUrl?: string;
  originalDate?: string;
  deletedAt?: string;
  locationName?: string;
}
