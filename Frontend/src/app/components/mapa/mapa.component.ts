import { Component, AfterViewInit, OnDestroy } from '@angular/core';

import { Map, Marker, setWorkerUrl } from 'maplibre-gl';

import { Capacitor } from '@capacitor/core';

import { Geolocation } from '@capacitor/geolocation';

import { ALERTAS_MOCK } from '../../mocks/alertas.mock';

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
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-58.4627, -34.6792],
      zoom: 15
    });

    this.map.on('load', () => {
      this.cargarAlertas();
    });

    this.obtenerUbicacion();
  }

  private async obtenerUbicacion(): Promise<void> {

    if (Capacitor.getPlatform() === 'web') {

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Ubicación:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error de geolocalización:', error);
        }
      );

      return;
    }

    const permissions = await Geolocation.requestPermissions();

    if (permissions.location !== 'granted') {
      console.error('Permiso de ubicación denegado');
      return;
    }

    const position = await Geolocation.getCurrentPosition();

    console.log('Ubicación:', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  }

private cargarAlertas(): void {
  ALERTAS_MOCK.forEach((alerta) => {
    if (!this.map) {
      return;
    }

    const markerElement = document.createElement('div');

    markerElement.innerText = '●';

    markerElement.style.color = 'red';
    markerElement.style.fontSize = '50px';
    markerElement.style.fontWeight = 'bold';
    markerElement.style.width = '50px';
    markerElement.style.height = '50px';
    markerElement.style.zIndex = '9999';

    new Marker({
      element: markerElement
    })
      .setLngLat([
        alerta.ubicacion.longitud,
        alerta.ubicacion.latitud
      ])
      .addTo(this.map);
  });
}

ngOnDestroy(): void {
  this.map?.remove();
}
}