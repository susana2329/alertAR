import { Component, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { FeatureCollection, Point, LineString, Polygon, MultiPolygon } from 'geojson';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  Map as MapLibreMap,
  LngLatBounds,
  Marker,
  Popup,
  GeoJSONSource,
  setWorkerUrl,
  type ExpressionSpecification,
  type LayerSpecification,
  type StyleSpecification
} from 'maplibre-gl';
import {
  locateOutline,
  layersOutline,
  checkmarkCircle,
  pulseOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { IonIcon } from '@ionic/angular';
import { Alerta, colorPresentacionAlerta, etiquetaNivelAlerta } from '../../models/alerta.model';
import { AlertaService } from '../../services/alerta.service';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

type EstiloMapa =
  | 'voyager'
  | 'light'
  | 'dark'
  | 'lightNoLabels'
  | 'darkNoLabels'
  | 'satellite';

type FiltroAlertas = 'todas' | 'oficial' | 'vecinal';
type CamaraMapa = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

const SOURCE_ID = 'alertas-source';
const POLYGON_SOURCE_ID = 'alerta-seleccionada-polygon-source';
const POLYGON_FILL_LAYER_ID = 'alerta-seleccionada-polygon-fill';
const POLYGON_OUTLINE_LAYER_ID = 'alerta-seleccionada-polygon-outline';

const POINT_HALO_LAYER = 'alertas-points-halo';
const POINT_BACKGROUND_LAYER = 'alertas-points-background';
const POINT_LAYER = 'alertas-points';
const SPIDER_SOURCE_ID = 'alertas-spiderfy-source';
const SPIDER_LEGS_LAYER = 'alertas-spiderfy-legs';
const SPIDER_HALO_LAYER = 'alertas-spiderfy-halo';
const SPIDER_BACKGROUND_LAYER = 'alertas-spiderfy-background';
const SPIDER_MARKER_LAYER = 'alertas-spiderfy-markers';
const SPIDER_CLOSE_BACKGROUND_LAYER = 'alertas-spiderfy-close-background';
const SPIDER_CLOSE_LAYER = 'alertas-spiderfy-close';
const SPIDER_SEARCH_RADIUS = 72;
const OVERLAP_RADIUS = 52;

const ICON_EMERGENCIA = 'alerta-icon-emergencia';
const ICON_ADVERTENCIA = 'alerta-icon-advertencia';
const ICON_PRECAUCION = 'alerta-icon-precaucion';
const ICON_INFORMATIVO = 'alerta-icon-informativo';
const ICON_DEFAULT = 'alerta-icon-default';
const ICON_SISMO = 'alerta-icon-sismo';

const COLORES_ALERTAS = {
  emergencia: '#ef3b3b',
  advertencia: '#f59e0b',
  precaucion: '#f6c945',
  informativo: '#2878bd',
  default: '#64748b'
};

const ICONOS_ALERTAS = [
  { id: ICON_EMERGENCIA, color: COLORES_ALERTAS.emergencia },
  { id: ICON_ADVERTENCIA, color: COLORES_ALERTAS.advertencia },
  { id: ICON_PRECAUCION, color: COLORES_ALERTAS.precaucion },
  { id: ICON_INFORMATIVO, color: COLORES_ALERTAS.informativo },
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
  estadoAlertas: 'cargando' | 'cargado' | 'error' = 'cargando';
  mensajeError = '';

  private map?: MapLibreMap;
  alertas: Alerta[] = [];
  private marcadorUsuario?: Marker;
  private popupActivo?: Popup;
  private alertaSeleccionada?: Alerta;
  private alertaPoligonoSeleccionada?: Alerta;
  private camaraPreviaCobertura?: CamaraMapa;
  private readonly modoCoberturaSignal = signal(false);
  get modoCobertura(): boolean {
    return this.modoCoberturaSignal();
  }
  set modoCobertura(activo: boolean) {
    this.modoCoberturaSignal.set(activo);
  }
  private handlersRegistrados = false;
  private configurandoAlertas = false;
  private readonly alertasPorId = new Map<string, Alerta>();
  private readonly spiderfiedIds = new Set<string>();
  private popupSpiderfy = false;

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

  constructor(
    private router: Router,
    private alertaService: AlertaService
  ) {
    addIcons({
      'locate-outline': locateOutline,
      'layers-outline': layersOutline,
      'checkmark-circle': checkmarkCircle,
      'pulse-outline': pulseOutline
    });
  }

  ngAfterViewInit(): void {
    setWorkerUrl(workerUrl);
    this.cargarAlertas();

    this.map = new MapLibreMap({
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

    this.map.on('movestart', () => this.manejarCambioDeVista());
    this.map.on('zoomstart', () => this.manejarCambioDeVista());
    this.map.on('resize', () => this.manejarCambioDeVista());

    void this.obtenerUbicacion();
  }

  cargarAlertas(): void {
    this.estadoAlertas = 'cargando';
    this.mensajeError = '';

    this.alertaService.listar().subscribe({
      next: (alertas) => {
        this.alertas = alertas;
        this.alertasPorId.clear();
        for (const alerta of alertas) this.alertasPorId.set(alerta.id, alerta);
        this.estadoAlertas = 'cargado';
        if (this.alertaSeleccionada) {
          this.alertaSeleccionada = this.alertasPorId.get(this.alertaSeleccionada.id);
        }
        this.cerrarPopupActivo();
        this.sincronizarCoberturaConAlertas();
        this.cerrarSpiderfy(false);
        this.actualizarFuenteAlertas();
      },
      error: (error: unknown) => {
        console.error('No se pudieron cargar las alertas:', error);
        this.estadoAlertas = 'error';
        this.mensajeError = 'No se pudieron cargar las alertas. Revisá la conexión e intentá nuevamente.';
      }
    });
  }

  cambiarEstiloMapa(estilo: EstiloMapa): void {
    this.selectorEstilosAbierto = false;

    if (!this.map || this.estiloMapaActual === estilo) return;

    this.cerrarSpiderfy();
    this.estiloMapaActual = estilo;
    this.map.setStyle(this.estilosMapa[estilo]);
  }

  private crearFeatureCollection(): FeatureCollection<Point> {
    const alertas = this.alertas.filter(
      (alerta) =>
        this.filtroActual === 'todas' ||
        alerta.origen === this.filtroActual
    );

    return {
      type: 'FeatureCollection',
      features: alertas.filter((alerta) => !this.spiderfiedIds.has(alerta.id) && this.ubicacionValida(alerta.ubicacion)).map((alerta) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [
            alerta.ubicacion!.longitud,
            alerta.ubicacion!.latitud
          ]
        },
        properties: {
          id: alerta.id,
          titulo: alerta.titulo,
          tipo: alerta.tipo,
          nivel: alerta.nivel,
          prioridad: this.obtenerPrioridad(alerta.nivel, alerta.naturaleza),
          color: this.obtenerColorAlerta(alerta.nivel, alerta.color, alerta.naturaleza),
          origen: alerta.origen,
          fuente: alerta.fuente ?? '',
          descripcion: alerta.descripcion,
          fechaInicio: alerta.fechaInicio
        }
      }))
    };
  }

  private ubicacionValida(ubicacion: Alerta['ubicacion']): ubicacion is NonNullable<Alerta['ubicacion']> {
    return !!ubicacion && Number.isFinite(ubicacion.latitud) && Number.isFinite(ubicacion.longitud)
      && ubicacion.latitud >= -90 && ubicacion.latitud <= 90
      && ubicacion.longitud >= -180 && ubicacion.longitud <= 180;
  }

  private obtenerPrioridad(nivel: string, naturaleza?: Alerta['naturaleza']): number {
    if (naturaleza === 'observacion' || naturaleza === 'contexto' || nivel === 'informativo' || nivel === 'desconocido') return 0;
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

  private crearSvgSismo(): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <path d="M8 53h20l12-27 18 51 13-30h21" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  private async registrarIconosAlertas(): Promise<void> {
    if (!this.map) return;

    const map = this.map;

    const iconos = [...ICONOS_ALERTAS.map((icono) => ({
      ...icono,
      svg: this.crearSvgAlerta(icono.color),
      pixelRatio: 100 / 38
    })), {
      id: ICON_SISMO,
      svg: this.crearSvgSismo(),
      pixelRatio: 100 / 38
    }];

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

      map.addSource(POLYGON_SOURCE_ID, {
        type: 'geojson',
        data: this.crearFeatureCollectionPoligono()
      });

      map.addLayer({
        id: POLYGON_FILL_LAYER_ID,
        type: 'fill',
        source: POLYGON_SOURCE_ID,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.14
        }
      });

      map.addLayer({
        id: POLYGON_OUTLINE_LAYER_ID,
        type: 'line',
        source: POLYGON_SOURCE_ID,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.95
        }
      });

      map.addSource(SOURCE_ID, {
        ...this.opcionesFuenteAlertas()
      });

      map.addSource(SPIDER_SOURCE_ID, {
        type: 'geojson',
        data: this.crearColeccionSpiderfy([])
      });

      this.agregarCapasMarcador(map, SOURCE_ID, {
        halo: POINT_HALO_LAYER,
        fondo: POINT_BACKGROUND_LAYER,
        icono: POINT_LAYER
      });

      this.agregarCapasSpiderfy(map);

      this.registrarEventosCapas();
      this.establecerVisibilidadCapasAlertas(!this.modoCobertura);
    } catch (error) {
      console.error('Error al configurar las alertas del mapa:', error);
    } finally {
      this.configurandoAlertas = false;
    }
  }

  private agregarCapasSpiderfy(map: MapLibreMap): void {
    map.addLayer({
      id: SPIDER_LEGS_LAYER,
      type: 'line',
      source: SPIDER_SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'leg'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1,
        'line-opacity': 0.7
      }
    });
    this.agregarCapasMarcador(map, SPIDER_SOURCE_ID, {
      halo: SPIDER_HALO_LAYER,
      fondo: SPIDER_BACKGROUND_LAYER,
      icono: SPIDER_MARKER_LAYER
    }, ['==', ['get', 'kind'], 'marker']);
    map.addLayer({
      id: SPIDER_CLOSE_BACKGROUND_LAYER,
      type: 'circle' as const,
      source: SPIDER_SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'center'],
      paint: {
        'circle-radius': 13,
        'circle-color': '#344054',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: SPIDER_CLOSE_LAYER,
      type: 'symbol',
      source: SPIDER_SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'center'],
      layout: {
        'text-field': '×',
        'text-size': 21,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#344054',
        'text-halo-width': 1
      }
    });
  }

  private agregarCapasMarcador(
    map: MapLibreMap,
    source: string,
    ids: { halo: string; fondo: string; icono: string },
    filtro?: ['==', ['get', 'kind'], string]
  ): void {
    const filtroMarcador = filtro ? { filter: filtro } : {};
    const colorPorNivel: ExpressionSpecification = [
      'match',
      ['get', 'color'],
      COLORES_ALERTAS.emergencia, COLORES_ALERTAS.emergencia,
      COLORES_ALERTAS.advertencia, COLORES_ALERTAS.advertencia,
      COLORES_ALERTAS.precaucion, COLORES_ALERTAS.precaucion,
      COLORES_ALERTAS.informativo, COLORES_ALERTAS.informativo,
      COLORES_ALERTAS.default
    ];

    const halo: LayerSpecification = {
      id: ids.halo,
      type: 'circle' as const,
      source,
      ...filtroMarcador,
      paint: {
        'circle-radius': 35,
        'circle-color': colorPorNivel,
        'circle-opacity': 0.14,
        'circle-blur': 0.15
      }
    };
    map.addLayer(halo);
    const fondo: LayerSpecification = {
      id: ids.fondo,
      type: 'circle' as const,
      source,
      ...filtroMarcador,
      paint: {
        'circle-radius': 26,
        'circle-color': colorPorNivel,
        'circle-opacity': 0.28
      }
    };
    map.addLayer(fondo);
    const icono: LayerSpecification = {
      id: ids.icono,
      type: 'symbol' as const,
      source,
      ...filtroMarcador,
      layout: {
        'icon-image': [
          'case',
          ['==', ['get', 'tipo'], 'sismo'], ICON_SISMO,
          ['match', ['get', 'nivel'],
            'emergencia', ICON_EMERGENCIA,
            'advertencia', ICON_ADVERTENCIA,
            'precaucion', ICON_PRECAUCION,
            'informativo', ICON_INFORMATIVO,
            ICON_DEFAULT
          ]
        ],
        'icon-size': 1,
        'icon-anchor': 'center',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    };
    map.addLayer(icono);
  }

  private opcionesFuenteAlertas() {
    return {
      type: 'geojson' as const,
      data: this.crearFeatureCollection(),
      cluster: false
    };
  }

  private crearColeccionSpiderfy(
    alertas: Alerta[],
    centro?: [number, number]
  ): FeatureCollection<Point | LineString> {
    const features: FeatureCollection<Point | LineString>['features'] = [];
    const map = this.map;
    if (!map || !centro || alertas.length < 2) {
      return { type: 'FeatureCollection', features };
    }

    const centroPx = map.project(centro);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    alertas.forEach((alerta, index) => {
      const ubicacion = alerta.ubicacion;
      if (!this.ubicacionValida(ubicacion)) return;
      const radio = 38 + 5.5 * Math.sqrt(index);
      const angulo = index * goldenAngle;
      const destino = map.unproject([
        centroPx.x + Math.cos(angulo) * radio,
        centroPx.y + Math.sin(angulo) * radio
      ]);
      const origen: [number, number] = [ubicacion.longitud, ubicacion.latitud];
      const puntoDesplegado: [number, number] = [destino.lng, destino.lat];
      const color = this.obtenerColorAlerta(alerta.nivel, alerta.color, alerta.naturaleza);

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [origen, puntoDesplegado] },
        properties: { kind: 'leg', color, id: alerta.id }
      });
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: puntoDesplegado },
        properties: {
          kind: 'marker',
          id: alerta.id,
          tipo: alerta.tipo,
          nivel: alerta.nivel,
          color
        }
      });
    });

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: centro },
      properties: { kind: 'center' }
    });
    return { type: 'FeatureCollection', features };
  }

  private obtenerAlertasSuperpuestas(punto: { x: number; y: number }): Array<{ alerta: Alerta; coordinates: [number, number]; pixel: { x: number; y: number } }> {
    if (!this.map) return [];
    const [x, y] = [punto.x, punto.y];
    const visibles = this.map.queryRenderedFeatures(
      [[x - SPIDER_SEARCH_RADIUS, y - SPIDER_SEARCH_RADIUS], [x + SPIDER_SEARCH_RADIUS, y + SPIDER_SEARCH_RADIUS]],
      { layers: [POINT_BACKGROUND_LAYER] }
    );
    const candidatos = new Map<string, { alerta: Alerta; coordinates: [number, number]; pixel: { x: number; y: number } }>();
    for (const feature of visibles) {
      if (feature.geometry.type !== 'Point') continue;
      const id = String(feature.properties?.['id'] ?? '');
      const alerta = this.alertasPorId.get(id);
      if (!alerta || !this.ubicacionValida(alerta.ubicacion)) continue;
      const coordinates = feature.geometry.coordinates as [number, number];
      candidatos.set(id, { alerta, coordinates, pixel: this.map.project(coordinates) });
    }

    const lista = [...candidatos.values()];
    const distanciaClick = (item: typeof lista[number]) => Math.hypot(item.pixel.x - x, item.pixel.y - y);
    const masCercano = lista.sort((a, b) => distanciaClick(a) - distanciaClick(b))[0];
    if (!masCercano || distanciaClick(masCercano) > SPIDER_SEARCH_RADIUS) return [];
    return lista.filter(item => Math.hypot(item.pixel.x - masCercano.pixel.x, item.pixel.y - masCercano.pixel.y) <= OVERLAP_RADIUS);
  }

  private desplegarSpiderfy(alertas: Alerta[], centro: [number, number]): void {
    if (!this.map || alertas.length < 2) return;
    this.cerrarSpiderfy();
    this.cerrarPopupActivo();
    for (const alerta of alertas) this.spiderfiedIds.add(alerta.id);
    const fuenteBase = this.map.getSource(SOURCE_ID);
    const fuenteSpiderfy = this.map.getSource(SPIDER_SOURCE_ID);
    if (fuenteBase instanceof GeoJSONSource && fuenteSpiderfy instanceof GeoJSONSource) {
      fuenteBase.setData(this.crearFeatureCollection());
      fuenteSpiderfy.setData(this.crearColeccionSpiderfy(alertas, centro));
    }
  }

  private cerrarSpiderfy(actualizarFuenteBase = true): void {
    if (!this.map) {
      this.spiderfiedIds.clear();
      return;
    }
    const estabaDesplegado = this.spiderfiedIds.size > 0;
    this.spiderfiedIds.clear();
    const fuenteSpiderfy = this.map.getSource(SPIDER_SOURCE_ID);
    if (fuenteSpiderfy instanceof GeoJSONSource && estabaDesplegado) {
      fuenteSpiderfy.setData(this.crearColeccionSpiderfy([]));
    }
    const fuenteBase = this.map.getSource(SOURCE_ID);
    if (actualizarFuenteBase && estabaDesplegado && fuenteBase instanceof GeoJSONSource) {
      fuenteBase.setData(this.crearFeatureCollection());
    }
    if (this.popupSpiderfy) this.cerrarPopupActivo();
  }

  private manejarCambioDeVista(): void {
    this.cerrarSpiderfy();
  }

  private establecerVisibilidadCapasAlertas(visible: boolean): void {
    const map = this.map;
    if (!map || typeof map.getLayer !== 'function' || typeof map.setLayoutProperty !== 'function') return;
    const visibilidad = visible ? 'visible' : 'none';
    for (const layerId of [
      POINT_HALO_LAYER,
      POINT_BACKGROUND_LAYER,
      POINT_LAYER,
      SPIDER_LEGS_LAYER,
      SPIDER_HALO_LAYER,
      SPIDER_BACKGROUND_LAYER,
      SPIDER_MARKER_LAYER,
      SPIDER_CLOSE_BACKGROUND_LAYER,
      SPIDER_CLOSE_LAYER
    ]) {
      if (map.getLayer(layerId) && map.getLayoutProperty(layerId, 'visibility') !== visibilidad) {
        map.setLayoutProperty(layerId, 'visibility', visibilidad);
      }
    }
  }

  private registrarEventosCapas(): void {
    if (!this.map || this.handlersRegistrados) return;

    this.handlersRegistrados = true;
    this.map.on('click', (event) => this.manejarClickMapa(event));

    for (const layerId of [POINT_LAYER, POINT_BACKGROUND_LAYER, SPIDER_MARKER_LAYER, SPIDER_BACKGROUND_LAYER, SPIDER_CLOSE_LAYER, SPIDER_CLOSE_BACKGROUND_LAYER]) {
      this.map.on('mouseenter', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = this.modoCobertura ? '' : 'pointer';
      });

      this.map.on('mouseleave', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    }
  }

  private manejarClickMapa(event: { point: { x: number; y: number } }): void {
    const map = this.map;
    if (!map || this.modoCobertura) return;

    if (this.spiderfiedIds.size) {
      const clickPoint: [number, number] = [event.point.x, event.point.y];
      const close = map.queryRenderedFeatures(clickPoint, { layers: [SPIDER_CLOSE_BACKGROUND_LAYER] })[0];
      if (close) {
        this.cerrarSpiderfy();
        return;
      }
      const spiderMarker = map.queryRenderedFeatures(clickPoint, { layers: [SPIDER_BACKGROUND_LAYER] })
        .filter(feature => feature.geometry.type === 'Point')
        .map(feature => ({ feature, pixel: map.project((feature.geometry as Point).coordinates as [number, number]) }))
        .sort((a, b) => Math.hypot(a.pixel.x - event.point.x, a.pixel.y - event.point.y) - Math.hypot(b.pixel.x - event.point.x, b.pixel.y - event.point.y))[0];
      if (spiderMarker && Math.hypot(spiderMarker.pixel.x - event.point.x, spiderMarker.pixel.y - event.point.y) <= 24) {
        const alerta = this.alertasPorId.get(String(spiderMarker.feature.properties?.['id'] ?? ''));
        if (alerta) this.abrirPopupAlerta(alerta, (spiderMarker.feature.geometry as Point).coordinates as [number, number], true);
        return;
      }
      this.cerrarSpiderfy();
    }

    const superpuestas = this.obtenerAlertasSuperpuestas(event.point);
    if (superpuestas.length > 1) {
      this.desplegarSpiderfy(superpuestas.map(item => item.alerta), superpuestas[0].coordinates);
      return;
    }
    if (superpuestas.length === 1) {
      this.abrirPopupAlerta(superpuestas[0].alerta, superpuestas[0].coordinates);
    }
  }

  private abrirPopupAlerta(alerta: Alerta, coordinates: [number, number], desdeSpiderfy = false): void {
    const map = this.map;
    if (!map) return;
    this.cerrarPopupActivo();

    const titulo = this.escaparHtml(alerta.titulo);
    const nivel = alerta.nivel;
    const descripcionOriginal = alerta.descripcionPreview ?? alerta.descripcion ?? '';
    const descripcion = this.escaparHtml(alerta.fuente === 'INA'
      ? descripcionOriginal.replace(/\s*Medición:\s*.*$/i, '')
      : descripcionOriginal);
    const resumen = descripcion ? `<p class="resumen">${descripcion}</p>` : '';
    const resumenMedicionINA = this.construirResumenMedicionINA(alerta);
    const fuente = this.escaparHtml(alerta.fuente || (alerta.origen === 'oficial' ? 'Fuente oficial' : 'Fuente vecinal'));
    const color = this.obtenerColorAlerta(nivel, alerta.color, alerta.naturaleza);
    const resumenSismo = this.construirResumenSismo(alerta, color);
    this.alertaSeleccionada = alerta;
    const accionCobertura = this.crearAccionCoberturaPopup(alerta);

    const popup = new Popup({ offset: 25, closeButton: true, closeOnClick: true, maxWidth: 'min(320px, calc(100vw - 32px))' })
      .setLngLat(coordinates)
      .setHTML(`
        <div class="alerta-popup">
          <h3>${titulo}</h3>
          ${this.construirEtiquetaClasificacion(alerta)}
          ${resumen}${resumenMedicionINA}${resumenSismo}
          <div class="fuente">${alerta.origen === 'oficial' ? `✓ ${fuente}` : 'Fuente: Vecinal'}</div>
          ${accionCobertura}
          <button class="alerta-popup__button alerta-popup__detail-button" type="button">Ver alerta completa</button>
        </div>
      `);

    this.popupActivo = popup;
    this.popupSpiderfy = desdeSpiderfy;
    popup.on('close', () => {
      if (this.popupActivo !== popup) return;
      this.popupActivo = undefined;
      this.popupSpiderfy = false;
    });
    popup.addTo(map);
    popup.getElement().querySelector<HTMLButtonElement>('.alerta-popup__coverage-button')?.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      this.iniciarExploracionCobertura(alerta);
    });
    popup.getElement().querySelector<HTMLButtonElement>('.alerta-popup__detail-button')?.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      void this.router.navigate(['/detalle-alerta', alerta.id]);
    });
  }

  filtrarAlertas(filtro: FiltroAlertas): void {
    this.filtroActual = filtro;

    if (this.alertaSeleccionada && !this.alertaVisibleConFiltro(this.alertaSeleccionada)) {
      this.cerrarPopupActivo();
      this.alertaSeleccionada = undefined;
    }
    if (this.alertaPoligonoSeleccionada && !this.alertaVisibleConFiltro(this.alertaPoligonoSeleccionada)) {
      this.salirExploracionCobertura();
    }

    this.actualizarFuenteAlertas();
  }

  volverAAlertas(): void {
    this.salirExploracionCobertura();
  }

  private alertaVisibleConFiltro(alerta: Alerta): boolean {
    return this.filtroActual === 'todas' || alerta.origen === this.filtroActual;
  }

  private alertaTienePoligono(alerta: Alerta): boolean {
    return !!alerta.geometria
      && alerta.geometria.type !== 'Point'
      && this.geometriaValida(alerta.geometria);
  }

  private crearAccionCoberturaPopup(alerta: Alerta): string {
    return this.alertaTienePoligono(alerta)
      ? '<button class="alerta-popup__button alerta-popup__coverage-button" type="button">Ver cobertura</button>'
      : '';
  }

  private iniciarExploracionCobertura(alerta: Alerta): void {
    if (!this.map || !this.alertaTienePoligono(alerta)) return;
    const actualizada = this.alertasPorId.get(alerta.id) ?? alerta;
    if (!this.alertaTienePoligono(actualizada) || !this.alertaVisibleConFiltro(actualizada)) return;

    if (!this.modoCobertura) {
      const center = this.map.getCenter().toArray();
      this.camaraPreviaCobertura = {
        center: [center[0], center[1]],
        zoom: this.map.getZoom(),
        bearing: this.map.getBearing(),
        pitch: this.map.getPitch()
      };
    }

    this.selectorEstilosAbierto = false;
    this.alertaPoligonoSeleccionada = actualizada;
    this.modoCobertura = true;
    this.cerrarPopupActivo();
    this.cerrarSpiderfy();
    this.establecerVisibilidadCapasAlertas(false);
    this.actualizarFuentePoligono();
    this.encuadrarCobertura(actualizada);
  }

  private encuadrarCobertura(alerta: Alerta): void {
    const geometria = alerta.geometria;
    if (!this.map || !geometria || geometria.type === 'Point' || !this.geometriaValida(geometria)) return;
    const poligonos = geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates;
    const bounds = new LngLatBounds();
    for (const poligono of poligonos) {
      for (const anillo of poligono) {
        for (const [longitud, latitud] of anillo) bounds.extend([longitud, latitud]);
      }
    }
    if (bounds.isEmpty()) return;

    const altoMapa = this.map.getContainer().clientHeight;
    const escalaMargen = Math.min(1, Math.max(0.5, (altoMapa - 96) / 240));
    this.map.fitBounds(bounds, {
      padding: {
        top: Math.round(104 * escalaMargen),
        right: 28,
        bottom: Math.round(136 * escalaMargen),
        left: 28
      },
      maxZoom: 14,
      duration: 450
    });
  }

  private sincronizarCoberturaConAlertas(): void {
    if (!this.modoCobertura || !this.alertaPoligonoSeleccionada) return;
    const actualizada = this.alertasPorId.get(this.alertaPoligonoSeleccionada.id);
    if (!actualizada || !this.alertaTienePoligono(actualizada) || !this.alertaVisibleConFiltro(actualizada)) {
      this.salirExploracionCobertura();
      return;
    }

    this.alertaPoligonoSeleccionada = actualizada;
    this.actualizarFuentePoligono();
    this.encuadrarCobertura(actualizada);
  }

  private salirExploracionCobertura(): void {
    if (!this.modoCobertura && !this.camaraPreviaCobertura) return;
    const camara = this.camaraPreviaCobertura;
    this.modoCobertura = false;
    this.alertaPoligonoSeleccionada = undefined;
    this.camaraPreviaCobertura = undefined;
    this.actualizarFuentePoligono();
    this.establecerVisibilidadCapasAlertas(true);
    this.actualizarFuenteAlertas();
    if (camara && this.map) this.map.easeTo({ ...camara, duration: 350 });
  }

  private actualizarFuenteAlertas(): void {
    this.cerrarSpiderfy();
    const source = this.map?.getSource(SOURCE_ID);
    if (!(source instanceof GeoJSONSource)) return;

    source.setData(this.crearFeatureCollection());
  }

  private crearFeatureCollectionPoligono(): FeatureCollection<Polygon | MultiPolygon> {
    const alerta = this.alertaPoligonoSeleccionada;
    const geometria = alerta?.geometria;

    if (!this.modoCobertura || !alerta || !geometria || !this.alertaTienePoligono(alerta)) {
      return { type: 'FeatureCollection', features: [] };
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: geometria as unknown as Polygon | MultiPolygon,
        properties: {
          color: this.obtenerColorAlerta(alerta.nivel, alerta.color, alerta.naturaleza)
        }
      }]
    };
  }

  private geometriaValida(geometria: NonNullable<Alerta['geometria']>): boolean {
    const validarAnillo = (anillo: number[][]) => {
      if (anillo.length < 4 || !anillo.every((p) =>
        Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
        && p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90)) return false;
      const primero = anillo[0];
      const ultimo = anillo[anillo.length - 1];
      const anilloCerrado = primero[0] === ultimo[0] && primero[1] === ultimo[1];
      const verticesDistintos = new Set(anillo.slice(0, -1).map(([lng, lat]) => `${lng},${lat}`)).size >= 3;
      return anilloCerrado && verticesDistintos;
    };
    if (geometria.type === 'Point') {
      const [lng, lat] = geometria.coordinates;
      return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    }
    const poligonos = geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates;
    return poligonos.length > 0 && poligonos.every((poligono) => poligono.length > 0 && poligono.every(validarAnillo));
  }

  private obtenerColorAlerta(nivel: string, presentacion?: Alerta['color'], naturaleza?: Alerta['naturaleza']): string {
    const color = colorPresentacionAlerta(nivel, presentacion, naturaleza);
    const paleta: Record<string, string> = {
      rojo: COLORES_ALERTAS.emergencia,
      naranja: COLORES_ALERTAS.advertencia,
      amarillo: COLORES_ALERTAS.precaucion,
      azul: COLORES_ALERTAS.informativo,
      neutro: COLORES_ALERTAS.default
    };
    return paleta[color];
  }

  private construirEtiquetaClasificacion(alerta: Alerta): string {
    const nivel = alerta.nivel;
    const color = colorPresentacionAlerta(nivel, alerta.color, alerta.naturaleza);
    const etiqueta = nivel === 'desconocido' ? 'DESCONOCIDO' : alerta.etiqueta ?? (alerta.naturaleza === 'contexto'
      ? 'INFORMATIVO' : etiquetaNivelAlerta(nivel));
    return `<span class="nivel nivel--${color}">${this.escaparHtml(etiqueta)}</span>`;
  }

  private construirResumenSismo(alerta: Alerta, color: string): string {
    if (alerta.tipo !== 'sismo') return '';

    const magnitud = this.valorNumericoFuente(alerta, 'magnitud');
    const profundidad = this.valorNumericoFuente(alerta, 'profundidad');
    if (magnitud === undefined && profundidad === undefined) return '';

    const magnitudHtml = magnitud === undefined ? '' : `
      <div class="sismo-popup__dato">
        <span class="sismo-popup__etiqueta">Magnitud</span>
        <strong>${magnitud.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong>
      </div>`;
    const profundidadHtml = profundidad === undefined ? '' : `
      <div class="sismo-popup__dato">
        <span class="sismo-popup__etiqueta">Profundidad</span>
        <strong>${profundidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })} km</strong>
      </div>`;

    return `
      <div class="sismo-popup" aria-label="Datos del sismo">
        <ion-icon class="sismo-popup__icono" name="pulse-outline" style="color:${color}" aria-hidden="true"></ion-icon>
        <div class="sismo-popup__datos">${magnitudHtml}${profundidadHtml}</div>
      </div>`;
  }

  private construirResumenMedicionINA(alerta: Alerta): string {
    if (alerta.fuente !== 'INA') return '';
    const medicion = alerta.detalle?.['medicion'];
    if (!medicion || typeof medicion !== 'object' || Array.isArray(medicion)) return '';
    const datos = medicion as Record<string, unknown>;
    const valor = typeof datos['valor'] === 'number' && Number.isFinite(datos['valor'])
      ? `${datos['valor'].toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${this.escaparHtml(typeof datos['unidad'] === 'string' && datos['unidad'] ? datos['unidad'] : 'm')}`
      : '';
    const fechaValor = typeof datos['fecha'] === 'string' ? new Date(datos['fecha']) : null;
    const fecha = fechaValor && Number.isFinite(fechaValor.getTime())
      ? fechaValor.toLocaleString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
      })
      : '';
    if (!valor && !fecha) return '';
    return `<p class="resumen"><strong>Medición INA${valor ? `: ${valor}` : ''}</strong>${fecha ? `<br>Registrada: ${this.escaparHtml(fecha)}` : ''}</p>`;
  }

  private valorNumericoFuente(alerta: Alerta, campo: string): number | undefined {
    const valor = alerta.detalle?.[campo];
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : undefined;
  }

  private actualizarFuentePoligono(): void {
    const source = this.map?.getSource(POLYGON_SOURCE_ID);
    if (source instanceof GeoJSONSource) {
      source.setData(this.crearFeatureCollectionPoligono());
    }
  }

  private cerrarPopupActivo(): void {
    const popup = this.popupActivo;
    this.popupActivo = undefined;
    this.popupSpiderfy = false;
    popup?.remove();
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
    this.modoCobertura = false;
    this.alertaPoligonoSeleccionada = undefined;
    this.camaraPreviaCobertura = undefined;
    this.cerrarSpiderfy();
    this.cerrarPopupActivo();
    this.marcadorUsuario?.remove();
    this.map?.remove();
  }
}
