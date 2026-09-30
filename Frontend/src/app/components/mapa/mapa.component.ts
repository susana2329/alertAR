import { Component, AfterViewInit, OnDestroy } from '@angular/core';

import { Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl';

import { Capacitor } from '@capacitor/core';

import { Geolocation } from '@capacitor/geolocation';
import { filterOutline } from 'ionicons/icons';
import { ALERTAS_MOCK } from '../../mocks/alertas.mock';
import { addIcons } from 'ionicons';
import { locateOutline } from 'ionicons/icons';
import { warningOutline } from 'ionicons/icons';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {

  filtroActual: 'todas' | 'oficial' | 'vecinal' = 'todas';

  constructor(private router: Router) {
  addIcons({
  'locate-outline': locateOutline,
  'filter-outline': filterOutline,
  'warning-outline': warningOutline
});
}

  private map?: Map;

  private ubicacionUsuario?: {
    latitud: number;
    longitud: number;
  };

  private marcadorUsuario?: Marker;

  private marcadores: {
    marker: Marker;
    fuente: 'oficial' | 'vecinal';
  }[] = [];

  private colorConOpacidad(hex: string, alpha: number): string {
    const valor = hex.replace('#', '');
    const r = Number.parseInt(valor.slice(0, 2), 16);
    const g = Number.parseInt(valor.slice(2, 4), 16);
    const b = Number.parseInt(valor.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

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

      this.ubicacionUsuario = {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude
      };

      console.log('Ubicación:', this.ubicacionUsuario);
      console.log('Precisión:', position.coords.accuracy, 'metros');

      this.mostrarUbicacionUsuario();

      this.map?.flyTo({
        center: [
          this.ubicacionUsuario.longitud,
          this.ubicacionUsuario.latitud
        ],
        zoom: 15
      });

    },

    (error) => {
      console.error('Error de geolocalización:', error);
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
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

    this.ubicacionUsuario = {
      latitud: position.coords.latitude,
      longitud: position.coords.longitude
    };

    this.mostrarUbicacionUsuario();

    console.log('Ubicación:', this.ubicacionUsuario);

    this.map?.flyTo({
      center: [
        this.ubicacionUsuario.longitud,
        this.ubicacionUsuario.latitud
      ],
      zoom: 15
    });
  }

  private mostrarUbicacionUsuario(): void {

    if (!this.map || !this.ubicacionUsuario) {
      return;
    }

    this.marcadorUsuario?.remove();

   const elemento = document.createElement('div');

elemento.style.width = '64px';
elemento.style.height = '64px';
elemento.style.borderRadius = '50%';
elemento.style.background = 'rgba(70, 80, 255, 0.30)';
elemento.style.display = 'flex';
elemento.style.alignItems = 'center';
elemento.style.justifyContent = 'center';

elemento.innerHTML = `
  <div
    style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #4650ff;
      border: 3px solid white;
      box-sizing: border-box;
    "
  ></div>
`;
this.marcadorUsuario = new Marker({
  element: elemento
})
  .setLngLat([
    this.ubicacionUsuario.longitud,
    this.ubicacionUsuario.latitud
  ])
  .addTo(this.map);
  }

  centrarEnMiUbicacion(): void {
  if (!this.map || !this.ubicacionUsuario) {
    return;
  }

  this.map.flyTo({
    center: [
      this.ubicacionUsuario.longitud,
      this.ubicacionUsuario.latitud
    ],
    zoom: 15
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

          <button
            class="alerta-popup__button"
            id="ver-alerta-${alerta.id}"
          >
            Ver alerta completa
          </button>

        </div>
      `);

    const markerElement = document.createElement('div');

    const colorAlerta = {
      emergencia: '#ef3b3b',
      advertencia: '#f5a623',
      precaucion: '#f6c945'
    }[alerta.nivel];

    markerElement.className = `alerta-marker alerta-marker--${alerta.nivel}`;
    markerElement.style.width = '58px';
    markerElement.style.height = '58px';
    markerElement.style.display = 'flex';
    markerElement.style.alignItems = 'center';
    markerElement.style.justifyContent = 'center';
    markerElement.style.borderRadius = '50%';
    markerElement.style.background = this.colorConOpacidad(colorAlerta, 0.32);
    markerElement.style.boxShadow = `0 0 0 10px ${this.colorConOpacidad(colorAlerta, 0.18)}`;
    markerElement.style.pointerEvents = 'auto';
    markerElement.style.overflow = 'visible';

    markerElement.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width="38"
        height="38"
      >
        <path
          d="M50 8 L94 88 H6 Z"
          fill="${colorAlerta}"
        />

        <line
          x1="50"
          y1="34"
          x2="50"
          y2="60"
          stroke="#ffffff"
          stroke-width="9"
          stroke-linecap="round"
        />

        <circle
          cx="50"
          cy="73"
          r="4.5"
          fill="#ffffff"
        />
      </svg>
    `;

const marker = new Marker({
  element: markerElement
})
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

          const boton = document.getElementById(
            `ver-alerta-${alerta.id}`
          );

          boton?.addEventListener('click', () => {
            this.router.navigate([
              '/detalle-alerta',
              alerta.id
            ]);
          });

        });

      });

    });

  }

  filtrarAlertas(
    filtro: 'todas' | 'oficial' | 'vecinal'
  ): void {

    this.filtroActual = filtro;

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