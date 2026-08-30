import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Journey, JourneyCreateDto, JourneySection, JourneySectionCreateDto } from '../models/journey.model';

@Injectable({
  providedIn: 'root'
})
export class JourneyService {
  private readonly api = inject(ApiService);

  getJourneys(): Observable<Journey[]> {
    return this.api.get<Journey[]>('/journeys');
  }

  getJourneyById(id: string): Observable<Journey> {
    return this.api.get<Journey>(`/journeys/${id}`);
  }

  createJourney(dto: JourneyCreateDto): Observable<Journey> {
    return this.api.post<Journey>('/journeys', dto);
  }

  addSection(journeyId: string, dto: JourneySectionCreateDto): Observable<JourneySection> {
    return this.api.post<JourneySection>(`/journeys/${journeyId}/sections`, dto);
  }
}
