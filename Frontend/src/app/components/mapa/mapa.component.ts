import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { FeatureCollection, Point } from 'geojson';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  Map,
  Marker,
  Popup,
  GeoJSONSource,
  setWorkerUrl,
  type StyleSpecification
} from 'maplibre-gl';
import {
  locateOutline,
  layersOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { IonIcon } from '@ionic/angular';
import { ALERTAS_MOCK } from '../../mocks/alertas.mock';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

type EstiloMapa =
  | 'voyager'
  | 'light'
  | 'dark'
  | 'lightNoLabels'
  | 'darkNoLabels'
  | 'satellite';

type FiltroAlertas = 'todas' | 'oficial' | 'vecinal';

const SOURCE_ID = 'alertas-source';

const CLUSTER_HALO_LAYER = 'alertas-clusters-halo';
const CLUSTER_LAYER = 'alertas-clusters';
const CLUSTER_COUNT_LAYER = 'alertas-cluster-count';

const POINT_HALO_LAYER = 'alertas-points-halo';
const POINT_BACKGROUND_LAYER = 'alertas-points-background';
const POINT_LAYER = 'alertas-points';

const ICON_EMERGENCIA = 'alerta-icon-emergencia';
const ICON_ADVERTENCIA = 'alerta-icon-advertencia';
const ICON_PRECAUCION = 'alerta-icon-precaucion';
const ICON_DEFAULT = 'alerta-icon-default';

const COLORES_ALERTAS = {
  emergencia: '#ef3b3b',
  advertencia: '#f59e0b',
  precaucion: '#f6c945',
  default: '#087f8c'
};

const ICONOS_ALERTAS = [
  { id: ICON_EMERGENCIA, color: COLORES_ALERTAS.emergencia },
  { id: ICON_ADVERTENCIA, color: COLORES_ALERTAS.advertencia },
  { id: ICON_PRECAUCION, color: COLORES_ALERTAS.precaucion },
  { id: ICON_DEFAULT, color: COLORES_ALERTAS.default }
];



@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  filtroActual: FiltroAlertas = 'todas';
  selectorEstilosAbierto = false;
  estiloMapaActual: EstiloMapa = 'dark';

  private map?: Map;
  private marcadorUsuario?: Marker;
  private popupActivo?: Popup;
  private handlersRegistrados = false;
  private configurandoAlertas = false;

  private ubicacionUsuario?: {
    latitud: number;
    longitud: number;
  };

  private readonly estilosMapa: Record<
    EstiloMapa,
    string | StyleSpecification
  > = {
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    lightNoLabels:
      'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
    darkNoLabels:
      'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
    satellite: {
      version: 8,
      sources: {
        imagery: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'satellite-imagery',
          type: 'raster',
          source: 'imagery'
        }
      ]
    }
  };

  constructor(private router: Router) {
    addIcons({
      'locate-outline': locateOutline,
      'layers-outline': layersOutline,
      'checkmark-circle': checkmarkCircle
    });
  }

  ngAfterViewInit(): void {
    setWorkerUrl(workerUrl);

    this.map = new Map({
      container: 'map',
      style: this.estilosMapa[this.estiloMapaActual],
      center: [-58.4627, -34.6792],
      zoom: 12
    });

    this.map.on('load', () => {
      void this.configurarAlertas();
    });

    this.map.on('style.load', () => {
      void this.configurarAlertas();
    });

    void this.obtenerUbicacion();
  }

  cambiarEstiloMapa(estilo: EstiloMapa): void {
    this.selectorEstilosAbierto = false;

    if (!this.map || this.estiloMapaActual === estilo) return;

    this.estiloMapaActual = estilo;
    this.map.setStyle(this.estilosMapa[estilo]);
  }

  private crearFeatureCollection(): FeatureCollection<Point> {
    const alertas = ALERTAS_MOCK.filter(
      (alerta) =>
        this.filtroActual === 'todas' ||
        alerta.origen === this.filtroActual
    );

    return {
      type: 'FeatureCollection',
      features: alertas.map((alerta) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [
            alerta.ubicacion.longitud,
            alerta.ubicacion.latitud
          ]
        },
        properties: {
          id: alerta.id,
          titulo: alerta.titulo,
          tipo: alerta.tipo,
          nivel: alerta.nivel,
          prioridad: this.obtenerPrioridad(alerta.nivel),
          origen: alerta.origen,
          fuente: alerta.fuente ?? '',
          descripcion: alerta.descripcion,
          fechaInicio: alerta.fechaInicio
        }
      }))
    };
  }

  private obtenerPrioridad(nivel: string): number {
    const prioridades: Record<string, number> = {
      precaucion: 1,
      advertencia: 2,
      emergencia: 3
    };

    return prioridades[nivel] ?? 0;
  }

  private crearSvgAlerta(color: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="100" height="100" viewBox="0 0 100 100">
        <path d="M50 8 L94 88 H6 Z" fill="${color}" />
        <line x1="50" y1="34" x2="50" y2="60"
              stroke="#ffffff" stroke-width="9" stroke-linecap="round" />
        <circle cx="50" cy="73" r="4.5" fill="#ffffff" />
      </svg>
    `;
  }

  private async registrarIconosAlertas(): Promise<void> {
    if (!this.map) return;

    const map = this.map;

    const iconos = ICONOS_ALERTAS.map((icono) => ({
      ...icono,
      svg: this.crearSvgAlerta(icono.color),
      pixelRatio: 100 / 38
    }));

    for (const icono of iconos) {
      if (map.hasImage(icono.id)) continue;

      const url =
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icono.svg)}`;

      await new Promise<void>((resolve, reject) => {
        const imagen = new Image();

        imagen.onload = () => {
          if (!this.map || this.map !== map) {
            resolve();
            return;
          }

          if (!map.hasImage(icono.id)) {
            map.addImage(icono.id, imagen, {
              pixelRatio: icono.pixelRatio
            });
          }

          resolve();
        };

        imagen.onerror = () => {
          reject(new Error(`No se pudo cargar el icono ${icono.id}`));
        };

        imagen.src = url;
      });
    }
  }

  private async configurarAlertas(): Promise<void> {
    if (!this.map || this.configurandoAlertas) return;
    if (this.map.getSource(SOURCE_ID)) return;

    this.configurandoAlertas = true;
    const map = this.map;

    try {
      await this.registrarIconosAlertas();

      if (this.map !== map || map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: this.crearFeatureCollection(),
        cluster: true,
        clusterRadius: 55,
        clusterMaxZoom: 14,
        clusterProperties: {
          gravedadMaxima: ['max', ['get', 'prioridad']]
        }
      });

      map.addLayer({
        id: CLUSTER_HALO_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'match',
            ['get', 'gravedadMaxima'],
            3, COLORES_ALERTAS.emergencia,
            2, COLORES_ALERTAS.advertencia,
            1, COLORES_ALERTAS.precaucion,
            COLORES_ALERTAS.default
          ],
          'circle-radius': 39,
          'circle-opacity': 0.18,
          'circle-blur': 0.15
        }
      });

      map.addLayer({
        id: 'alertas-clusters-background',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 32,
          'circle-color': [
            'match',
            ['get', 'gravedadMaxima'],
            3, COLORES_ALERTAS.emergencia,
            2, COLORES_ALERTAS.advertencia,
            1, COLORES_ALERTAS.precaucion,
            COLORES_ALERTAS.default
          ],
          'circle-opacity': 0.28
        }
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': [
            'match',
            ['get', 'gravedadMaxima'],
            3, ICON_EMERGENCIA,
            2, ICON_ADVERTENCIA,
            1, ICON_PRECAUCION,
            ICON_DEFAULT
          ],
          'icon-size': 1.45,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': [
            'case',
            ['>', ['get', 'point_count'], 99],
            '99+',
            ['to-string', ['get', 'point_count']]
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-offset': [1.55, -1.35],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#202124',
          'text-halo-width': 6,
          'text-halo-blur': 0.2
        }
      });

      map.addLayer({
        id: POINT_HALO_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 35,
          'circle-color': [
            'match',
            ['get', 'nivel'],
            'emergencia', COLORES_ALERTAS.emergencia,
            'advertencia', COLORES_ALERTAS.advertencia,
            'precaucion', COLORES_ALERTAS.precaucion,
            COLORES_ALERTAS.default
          ],
          'circle-opacity': 0.14,
          'circle-blur': 0.15
        }
      });

      map.addLayer({
        id: POINT_BACKGROUND_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 26,
          'circle-color': [
            'match',
            ['get', 'nivel'],
            'emergencia', COLORES_ALERTAS.emergencia,
            'advertencia', COLORES_ALERTAS.advertencia,
            'precaucion', COLORES_ALERTAS.precaucion,
            COLORES_ALERTAS.default
          ],
          'circle-opacity': 0.28
        }
      });

      map.addLayer({
        id: POINT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'nivel'],
            'emergencia', ICON_EMERGENCIA,
            'advertencia', ICON_ADVERTENCIA,
            'precaucion', ICON_PRECAUCION,
            ICON_DEFAULT
          ],
          'icon-size': 1,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      this.registrarEventosCapas();
    } catch (error) {
      console.error('Error al configurar las alertas del mapa:', error);
    } finally {
      this.configurandoAlertas = false;
    }
  }

  private registrarEventosCapas(): void {
    if (!this.map || this.handlersRegistrados) return;

    this.handlersRegistrados = true;

    this.map.on('click', CLUSTER_LAYER, async (event) => {
      if (!this.map) return;

      const feature = this.map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_LAYER]
      })[0];

      if (!feature) return;

      const clusterId = feature.properties?.['cluster_id'];
      if (clusterId === undefined) return;

      const source = this.map.getSource(SOURCE_ID);
      if (!(source instanceof GeoJSONSource)) return;

      try {
        const zoom = await source.getClusterExpansionZoom(Number(clusterId));
        if (!this.map) return;

        const coordinates = (feature.geometry as Point)
          .coordinates as [number, number];

        this.map.easeTo({ center: coordinates, zoom });
      } catch (error) {
        console.error('Error al expandir el clúster:', error);
      }
    });

    this.map.on('click', POINT_LAYER, (event) => {
      if (!this.map) return;

      const feature = this.map.queryRenderedFeatures(event.point, {
        layers: [POINT_LAYER]
      })[0];

      if (!feature?.properties) return;

      const properties = feature.properties;
      const coordinates = (feature.geometry as Point)
        .coordinates as [number, number];

      const id = String(properties['id']);
      const titulo = this.escaparHtml(String(properties['titulo'] ?? ''));
      const nivel = String(properties['nivel'] ?? '');
      const descripcion = this.escaparHtml(
        String(properties['descripcion'] ?? '')
      );
      const origen = String(properties['origen'] ?? '');
      const fuente = this.escaparHtml(String(properties['fuente'] ?? ''));

      const colores: Record<string, string> = {
        emergencia: COLORES_ALERTAS.emergencia,
        advertencia: COLORES_ALERTAS.advertencia,
        precaucion: COLORES_ALERTAS.precaucion
      };
      const color = colores[nivel] ?? COLORES_ALERTAS.default;

      this.popupActivo?.remove();

      
const popup = new Popup({
  offset: 25,
  closeButton: true,
  closeOnClick: true,
  maxWidth: '320px'
})
  .setLngLat(coordinates)
  .setHTML(`
    <div class="alerta-popup">
      <h3>${titulo}</h3>
      <span class="nivel" style="background:${color}">
        ${this.escaparHtml(nivel)}
      </span>
      <p>${descripcion}</p>
      <div class="fuente">
        ${origen === 'oficial' ? `✓ ${fuente}` : 'Fuente: Vecinal'}
      </div>
      <button class="alerta-popup__button" type="button">
        Ver alerta completa
      </button>
    </div>
  `);

this.popupActivo = popup;

popup.addTo(this.map);

const boton = popup
  .getElement()
  .querySelector<HTMLButtonElement>('.alerta-popup__button');

boton?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();

  void this.router.navigate([
    '/detalle-alerta',
    id
  ]);
});
    });

    for (const layerId of [CLUSTER_LAYER, POINT_LAYER]) {
      this.map.on('mouseenter', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    }
  }

  filtrarAlertas(filtro: FiltroAlertas): void {
    this.filtroActual = filtro;

    const source = this.map?.getSource(SOURCE_ID);
    if (!(source instanceof GeoJSONSource)) return;

    source.setData(this.crearFeatureCollection());
  }

  private escaparHtml(valor: string): string {
    return valor.replace(/[&<>"']/g, (caracter) => {
      const entidades: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };

      return entidades[caracter];
    });
  }

  private async obtenerUbicacion(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            });
          }
        );

        this.ubicacionUsuario = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        };
      } else {
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
      }

      this.mostrarUbicacionUsuario();

      this.map?.flyTo({
        center: [
          this.ubicacionUsuario.longitud,
          this.ubicacionUsuario.latitud
        ],
        zoom: 15
      });
    } catch (error) {
      console.error('Error de geolocalización:', error);
    }
  }

  private mostrarUbicacionUsuario(): void {
    if (!this.map || !this.ubicacionUsuario) return;

    this.marcadorUsuario?.remove();

    const elemento = document.createElement('div');
    elemento.style.width = '64px';
    elemento.style.height = '64px';
    elemento.style.borderRadius = '50%';
    elemento.style.background = 'rgba(70, 80, 255, 0.30)';
    elemento.style.display = 'flex';
    elemento.style.alignItems = 'center';
    elemento.style.justifyContent = 'center';

    const punto = document.createElement('div');
    punto.style.width = '24px';
    punto.style.height = '24px';
    punto.style.borderRadius = '50%';
    punto.style.background = '#4650ff';
    punto.style.border = '3px solid white';
    punto.style.boxSizing = 'border-box';

    elemento.appendChild(punto);

    this.marcadorUsuario = new Marker({ element: elemento })
      .setLngLat([
        this.ubicacionUsuario.longitud,
        this.ubicacionUsuario.latitud
      ])
      .addTo(this.map);
  }

  centrarEnMiUbicacion(): void {
    if (!this.map || !this.ubicacionUsuario) return;

    this.map.flyTo({
      center: [
        this.ubicacionUsuario.longitud,
        this.ubicacionUsuario.latitud
      ],
      zoom: 15
    });
  }

  ngOnDestroy(): void {
    this.popupActivo?.remove();
    this.marcadorUsuario?.remove();
    this.map?.remove();
  }
}
