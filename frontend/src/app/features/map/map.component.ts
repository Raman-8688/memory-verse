import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemoryService } from '@core/services/memory.service';
import { JourneyService } from '@core/services/journey.service';
import { PlaceService } from '@core/services/place.service';
import { Memory } from '@core/models/memory.model';
import { Journey } from '@core/models/journey.model';
import { PlaceSummary } from '@core/models/place.model';

declare let L: any;

@Component({
  selector: 'mv-map',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private readonly memoryService = inject(MemoryService);
  private readonly journeyService = inject(JourneyService);
  private readonly placeService = inject(PlaceService);

  readonly memories = signal<Memory[]>([]);
  readonly journeys = signal<Journey[]>([]);
  readonly places = signal<PlaceSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly selectedJourneyId = signal<string>('');
  readonly searchQuery = signal<string>('');
  readonly totalMappedMemories = signal<number>(0);

  private map?: any;
  private markersLayer?: any;

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!this.mapContainerRef) return;

    // Fix default Leaflet icon assets
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Default center on India / World
    this.map = L.map(this.mapContainerRef.nativeElement, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // High quality OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // If memories are already loaded, render pins
    if (this.memories().length > 0) {
      this.renderMarkers();
    }
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    this.journeyService.getJourneys().subscribe({
      next: (j: Journey[]) => this.journeys.set(j || [])
    });

    this.placeService.getPlaces().subscribe({
      next: (p: PlaceSummary[]) => this.places.set(p || [])
    });

    this.memoryService.getMemories({ page: 0, size: 100 }).subscribe({
      next: (res) => {
        const withCoords = (res.content || []).filter(m => m.latitude && m.longitude);
        this.memories.set(withCoords);
        this.totalMappedMemories.set(withCoords.length);
        this.isLoading.set(false);

        if (this.map) {
          this.renderMarkers();
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const filtered = this.getFilteredMemories();
    const latLngs: any[] = [];

    // Custom pulse terracotta marker icon
    const customIcon = L.divIcon({
      className: 'mv-custom-map-marker',
      html: `<div class="marker-pin-wrap"><div class="marker-pin-inner"><span class="pin-dot"></span></div><div class="marker-pulse"></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    filtered.forEach(m => {
      if (!m.latitude || !m.longitude) return;

      const latLng: [number, number] = [m.latitude, m.longitude];
      latLngs.push(latLng);

      const marker = L.marker(latLng, { icon: customIcon });

      const thumbUrl = m.mediaList && m.mediaList.length > 0 ? (m.mediaList[0].thumbnailUrl || m.mediaList[0].mediaUrl) : '';
      const formattedDate = m.memoryDate ? new Date(m.memoryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

      const popupHtml = `
        <div class="mv-map-popup-card">
          ${thumbUrl ? `<img src="${thumbUrl}" class="popup-thumb" alt="${m.title}" />` : ''}
          <div class="popup-content">
            <span class="popup-date">${formattedDate}</span>
            <h4 class="popup-title">${m.title}</h4>
            <span class="popup-location">📍 ${m.locationName || 'Unknown Location'}</span>
            <a href="/memories/${m.id}" class="popup-cta">Relive Story →</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'mv-leaflet-popup-wrapper' });
      this.markersLayer!.addLayer(marker);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  getFilteredMemories(): Memory[] {
    return this.memories().filter(m => {
      const matchJourney = !this.selectedJourneyId() || m.journeyId === this.selectedJourneyId();
      const matchSearch = !this.searchQuery() ||
        m.title.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
        (m.locationName && m.locationName.toLowerCase().includes(this.searchQuery().toLowerCase()));
      return matchJourney && matchSearch;
    });
  }

  onFilterChange(): void {
    this.renderMarkers();
  }

  fitAllMarkers(): void {
    const filtered = this.getFilteredMemories();
    const latLngs = filtered.map(m => [m.latitude!, m.longitude!] as [number, number]);
    if (this.map && latLngs.length > 0) {
      this.map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 14 });
    }
  }
}
