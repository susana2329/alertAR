import { Component, AfterViewInit, OnDestroy } from '@angular/core';

import { Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl';

import { Capacitor } from '@capacitor/core';

import { Geolocation } from '@capacitor/geolocation';

import { ALERTAS_MOCK } from '../../mocks/alertas.mock';

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import { Router } from '@angular/router';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
filtroActual: 'todas' | 'oficial' | 'vecinal' = 'todas';
  constructor(private router: Router) {}

  private map?: Map;

private marcadores: {
  marker: Marker;
  fuente: 'oficial' | 'vecinal';
}[] = [];

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

      const popup = new Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true
      }).setHTML(`
  <div class="alerta-popup">
    <h3>${alerta.titulo}</h3>

    <span class="nivel">
      ${alerta.nivel}
    </span>

    <p>${alerta.descripcion}</p>

   <div class="fuente">
  ${
    alerta.origen === 'oficial'
      ? `✓ ${alerta.fuente}`
      : 'Fuente: Vecinal'
  }
</div>
`)

const marker = new Marker()
  .setLngLat([
    alerta.ubicacion.longitud,
    alerta.ubicacion.latitud
  ])
  .setPopup(popup)
  .addTo(this.map);

this.marcadores.push({
  marker,
  fuente: alerta.origen
});

marker.getElement().addEventListener('click', () => {

  setTimeout(() => {

    const boton = document.getElementById(`ver-alerta-${alerta.id}`);

    boton?.addEventListener('click', () => {
      this.router.navigate(['/detalle-alerta', alerta.id]);
    });

  });

});

    });
  }

filtrarAlertas(filtro: 'todas' | 'oficial' | 'vecinal'): void {  this.filtroActual = filtro;

  this.marcadores.forEach(({ marker, fuente }) => {
    if (filtro === 'todas' || fuente === filtro) {
      marker.addTo(this.map!);
    } else {
      marker.remove();
    }
  });
}

  ngOnDestroy(): void {
    this.map?.remove();
  }
}