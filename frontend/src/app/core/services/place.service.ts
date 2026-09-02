import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PlaceSummary } from '../models/place.model';

@Injectable({
  providedIn: 'root'
})
export class PlaceService {
  private readonly api = inject(ApiService);

  getPlaces(): Observable<PlaceSummary[]> {
    return this.api.get<PlaceSummary[]>('/places');
  }
}
