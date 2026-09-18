import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Map, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {

  private map?: Map;

  ngAfterViewInit(): void {
    setWorkerUrl(workerUrl);

    this.map = new Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: [-58.4627, -34.6792],
      zoom: 12
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}