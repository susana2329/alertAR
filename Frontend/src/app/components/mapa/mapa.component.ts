import { ChangeDetectorRef, Component, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import type { FeatureCollection, Point, LineString, Polygon, MultiPolygon } from 'geojson';
import {
  Map as MapLibreMap,
  LngLatBounds,
  Marker,
  Popup,
  GeoJSONSource,
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
import { SesionService } from '../../services/sesion.service';
import { configurarWorkerMapLibre } from './maplibre-worker';
import { diagnosticarError } from '../../utils/diagnostico-error';
import { environment } from '../../../environments/environment';
import { firstValueFrom, Subscription, timeout } from 'rxjs';

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
const CAPAS_ALERTAS = [
  POLYGON_FILL_LAYER_ID,
  POLYGON_OUTLINE_LAYER_ID,
  POINT_HALO_LAYER,
  POINT_BACKGROUND_LAYER,
  POINT_LAYER,
  SPIDER_LEGS_LAYER,
  SPIDER_HALO_LAYER,
  SPIDER_BACKGROUND_LAYER,
  SPIDER_MARKER_LAYER,
  SPIDER_CLOSE_BACKGROUND_LAYER,
  SPIDER_CLOSE_LAYER
];
const SPIDER_SEARCH_RADIUS = 72;
const OVERLAP_RADIUS = 52;
const TIMEOUT_ALERTAS_MS = 20000;
const INTERVALO_ACTUALIZACION_ALERTAS_MS = 30000;

const ICON_EMERGENCIA = 'alerta-icon-emergencia';
const ICON_ADVERTENCIA = 'alerta-icon-advertencia';
const ICON_PRECAUCION = 'alerta-icon-precaucion';
const ICON_INFORMATIVO = 'alerta-icon-informativo';
const ICON_DEFAULT = 'alerta-icon-default';
const ICON_SISMO = 'alerta-icon-sismo';
const ICON_VECINAL = 'alerta-icon-vecinal';

const COLORES_ALERTAS = {
  emergencia: '#ef3b3b',
  advertencia: '#f59e0b',
  precaucion: '#f6c945',
  informativo: '#2878bd',
  vecinal: '#0f9f8f',
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
  readonly modoMock = environment.mockReportesVecinales;
  private registrarDebug(mensaje: string): void {
    if (!environment.production) console.info(mensaje);
  }
  filtroActual: FiltroAlertas = 'todas';
  selectorEstilosAbierto = false;
  estiloMapaActual: EstiloMapa = this.recuperarEstiloGuardado();
  estadoAlertas: 'cargando' | 'cargado' | 'error' = 'cargando';
  mensajeError = '';
  mensajeUbicacion = '';

  private recuperarEstiloGuardado(): EstiloMapa {
    try {
      const guardado = localStorage.getItem('alertar_map_style') as EstiloMapa;
      const validos: EstiloMapa[] = ['voyager', 'light', 'dark', 'lightNoLabels', 'darkNoLabels', 'satellite'];
      if (guardado && validos.includes(guardado)) {
        return guardado;
      }
    } catch { /* Fallback */ }
    return 'dark';
  }

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
  private solicitudAlertas?: Subscription;
  private actualizacionPeriodica?: ReturnType<typeof setInterval>;
  private generacionFuenteAlertas = 0;
  private revisionDatosFuenteAlertas = 0;
  private readonly urlAlertasMapa = `${environment.apiUrl.replace(/\/$/, '')}/alertas/mapa`;
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
    private alertaService: AlertaService,
    private sesion: SesionService,
    private location: Location,
    private changeDetector: ChangeDetectorRef
  ) {
    addIcons({
      'locate-outline': locateOutline,
      'layers-outline': layersOutline,
      'checkmark-circle': checkmarkCircle,
      'pulse-outline': pulseOutline
    });
  }
  volverAtras() {
    this.location.back();
  }
  ngAfterViewInit(): void {
    configurarWorkerMapLibre(document.baseURI);
    this.cargarAlertas();

    this.map = new MapLibreMap({
      container: 'map',
      style: this.estilosMapa[this.estiloMapaActual],
      center: [-58.4627, -34.6792],
      zoom: 12
    });

    this.map.on('style.load', () => {
      void this.inicializarEstiloAlertas();
    });

    this.map.on('error', event => {
      const eventoMapLibre = event as typeof event & {
        sourceId?: string;
        sourceDataType?: string;
        tile?: { uid?: number; state?: string; tileID?: { toString: () => string } };
      };
      const datosEvento = Object.fromEntries(
        Object.entries(event).filter(([clave]) => clave !== 'target')
      );
      console.error('[MapLibre] Error de mapa o recurso ' + JSON.stringify({
        estilo: this.estiloMapaActual,
        sourceId: eventoMapLibre.sourceId,
        sourceDataType: eventoMapLibre.sourceDataType,
        tile: eventoMapLibre.tile ? {
          uid: eventoMapLibre.tile.uid,
          state: eventoMapLibre.tile.state,
          id: eventoMapLibre.tile.tileID?.toString()
        } : undefined,
        error: diagnosticarError(event.error),
        evento: diagnosticarError(datosEvento)
      }));
    });

    this.map.on('sourcedataloading', event => this.registrarEventoFuenteAlertas('sourcedataloading', event));
    this.map.on('sourcedata', event => this.registrarEventoFuenteAlertas('sourcedata', event));
    this.map.on('sourcedataabort', event => this.registrarEventoFuenteAlertas('sourcedataabort', event));

    this.map.on('movestart', () => this.manejarCambioDeVista());
    this.map.on('zoomstart', () => this.manejarCambioDeVista());
    this.map.on('resize', () => this.manejarCambioDeVista());

    void this.obtenerUbicacion();
    this.actualizacionPeriodica = setInterval(() => {
      if (!this.popupActivo) this.cargarAlertas(true);
    }, INTERVALO_ACTUALIZACION_ALERTAS_MS);
  }

  private crearSvgVecinal(): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <path d="M50 8 L94 88 H6 Z" fill="${COLORES_ALERTAS.vecinal}" />
        <path d="M32 40h36v23H53l-9 8v-8h-12z" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" />
        <circle cx="42" cy="51" r="2.5" fill="#ffffff" />
        <circle cx="50" cy="51" r="2.5" fill="#ffffff" />
        <circle cx="58" cy="51" r="2.5" fill="#ffffff" />
      </svg>
    `;
  }

  cargarAlertas(enSegundoPlano = false): void {
    if (this.solicitudAlertas && !this.solicitudAlertas.closed) return;
    if (!enSegundoPlano) {
      this.estadoAlertas = 'cargando';
      this.mensajeError = '';
      this.changeDetector.markForCheck();
    }

    this.registrarDebug('[Mapa] Solicitando alertas ' + JSON.stringify({ url: this.urlAlertasMapa }));
    this.solicitudAlertas = this.alertaService.listarParaMapa().pipe(
      timeout({ first: TIMEOUT_ALERTAS_MS })
    ).subscribe({
      next: (alertas) => {
        try {
          this.alertas = alertas;
          this.alertasPorId.clear();
          for (const alerta of alertas) this.alertasPorId.set(alerta.id, alerta);
          if (this.alertaSeleccionada) {
            this.alertaSeleccionada = this.alertasPorId.get(this.alertaSeleccionada.id);
          }
          if (!enSegundoPlano) this.cerrarPopupActivo();
          this.sincronizarCoberturaConAlertas();
          this.cerrarSpiderfy(false);
          this.actualizarFuenteAlertas();
          this.estadoAlertas = 'cargado';
          this.changeDetector.markForCheck();
          const geojson = this.crearFeatureCollection();
          this.registrarDebug('[Mapa] Alertas recibidas ' + JSON.stringify({
            cantidad: alertas.length,
            conUbicacionValida: alertas.filter(alerta => this.ubicacionValida(alerta?.ubicacion)).length,
            featuresGeoJSON: geojson.features.length
          }));
        } catch (error) {
          this.mensajeError = 'No se pudieron procesar las alertas recibidas.';
          this.estadoAlertas = 'error';
          this.changeDetector.markForCheck();
          console.error('[Mapa] Error procesando respuesta de alertas ' + JSON.stringify(diagnosticarError(error, this.urlAlertasMapa)));
        }
      },
      error: (error: unknown) => {
        if (!enSegundoPlano || this.alertas.length === 0) {
          this.estadoAlertas = 'error';
          this.mensajeError = 'No se pudieron cargar las alertas. Revisá la conexión e intentá nuevamente.';
          this.changeDetector.markForCheck();
        }
        console.error('[Mapa] Falló la solicitud de alertas ' + JSON.stringify(diagnosticarError(error, this.urlAlertasMapa)));
        this.solicitudAlertas = undefined;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.actualizacionPeriodica) clearInterval(this.actualizacionPeriodica);
    this.solicitudAlertas?.unsubscribe();
    this.modoCobertura = false;
    this.alertaPoligonoSeleccionada = undefined;
    this.camaraPreviaCobertura = undefined;
    this.cerrarSpiderfy();
    this.cerrarPopupActivo();
    this.marcadorUsuario?.remove();
    this.map?.remove();
  }

  cambiarEstiloMapa(estilo: EstiloMapa): void {
    this.selectorEstilosAbierto = false;

    if (!this.map || this.estiloMapaActual === estilo) return;

    this.cerrarSpiderfy();
    this.estiloMapaActual = estilo;
    try {
      localStorage.setItem('alertar_map_style', estilo);
    } catch { /* Fallback seguro */ }
    this.map.setStyle(this.estilosMapa[estilo], { diff: false });
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
          color: alerta.origen === 'vecinal'
            ? COLORES_ALERTAS.vecinal
            : this.obtenerColorAlerta(alerta.nivel, alerta.color, alerta.naturaleza),
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
    }, {
      id: ICON_VECINAL,
      svg: this.crearSvgVecinal(),
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
    if (this.map.getSource(SOURCE_ID)) {
      this.actualizarFuenteAlertas();
      return;
    }

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

      const opcionesFuenteAlertas = this.opcionesFuenteAlertas();
      const generacion = ++this.generacionFuenteAlertas;
    this.registrarDebug('[MapLibre] Creando fuente GeoJSON ' + JSON.stringify({
        estilo: this.estiloMapaActual,
        generacion,
        ...this.resumirGeoJSON(opcionesFuenteAlertas.data)
      }));
      map.addSource(SOURCE_ID, opcionesFuenteAlertas);

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
      await this.registrarEstadoFuenteAlertas('fuente creada en style.load');
    } catch (error) {
      console.error('[MapLibre] Error al configurar las alertas del mapa ' + JSON.stringify({
        estilo: this.estiloMapaActual,
        error: diagnosticarError(error)
      }));
    } finally {
      this.configurandoAlertas = false;
    }
  }

  private async inicializarEstiloAlertas(): Promise<void> {
    this.registrarDebug('[MapLibre] style.load ' + JSON.stringify({
      estilo: this.estiloMapaActual,
      generacionFuenteAlertas: this.generacionFuenteAlertas,
      fuenteExisteAntesDeConfigurar: !!this.map?.getSource(SOURCE_ID)
    }));
    await this.configurarAlertas();
    await this.registrarEstadoFuenteAlertas('comprobación posterior a style.load');
  }

  private async registrarEstadoFuenteAlertas(etapa: string): Promise<void> {
    const map = this.map;
    if (!map) return;

    const fuente = map.getSource(SOURCE_ID);
    const capas = CAPAS_ALERTAS.map(id => ({ id, existe: !!map.getLayer(id) }));
    let cantidadFeaturesFuente: number | null = null;
    let errorFuente: unknown;
    if (fuente instanceof GeoJSONSource) {
      try {
        const data = await fuente.getData();
        cantidadFeaturesFuente = data.type === 'FeatureCollection' ? data.features.length : 1;
      } catch (error) {
        errorFuente = diagnosticarError(error);
      }
    }

    this.registrarDebug('[MapLibre] Estado de fuente y capas ' + JSON.stringify({
      etapa,
      estilo: this.estiloMapaActual,
      generacion: this.generacionFuenteAlertas,
      fuenteExiste: !!fuente,
      fuenteGeoJSON: fuente instanceof GeoJSONSource,
      cantidadFeaturesFuente,
      capas,
      errorFuente
    }));
  }

  private registrarEventoFuenteAlertas(tipo: string, evento: {
    sourceId?: string;
    sourceDataType?: string;
    isSourceLoaded?: boolean;
    coord?: { overscaledZ?: number; wrap?: number; canonical?: { z: number; x: number; y: number } };
    tile?: { uid?: number; state?: string; tileID?: { toString: () => string } };
  }): void {
    if (evento.sourceId !== SOURCE_ID) return;
    this.registrarDebug('[MapLibre] Evento de fuente GeoJSON ' + JSON.stringify({
      tipo,
      estilo: this.estiloMapaActual,
      generacion: this.generacionFuenteAlertas,
      sourceDataType: evento.sourceDataType,
      isSourceLoaded: evento.isSourceLoaded,
      coord: evento.coord ? {
        z: evento.coord.canonical?.z,
        x: evento.coord.canonical?.x,
        y: evento.coord.canonical?.y,
        overscaledZ: evento.coord.overscaledZ,
        wrap: evento.coord.wrap
      } : undefined,
      tile: evento.tile ? {
        uid: evento.tile.uid,
        state: evento.tile.state,
        id: evento.tile.tileID?.toString()
      } : undefined
    }));
  }

  private resumirGeoJSON(data: FeatureCollection<Point>): Record<string, unknown> {
    const features = data.features;
    const geometrias: Record<string, number> = {};
    const tiposPropiedades: Record<string, Record<string, number>> = {};
    const coordenadas: { minLongitud: number; maxLongitud: number; minLatitud: number; maxLatitud: number } = {
      minLongitud: Infinity,
      maxLongitud: -Infinity,
      minLatitud: Infinity,
      maxLatitud: -Infinity
    };
    let coordenadasValidas = 0;
    let bytesSerializadosAprox = 0;
    let maxCadenaPropiedad = 0;

    for (const feature of features) {
      geometrias[feature.geometry.type] = (geometrias[feature.geometry.type] ?? 0) + 1;
      if (feature.geometry.type === 'Point') {
        const [longitud, latitud] = feature.geometry.coordinates;
        if (Number.isFinite(longitud) && Number.isFinite(latitud)) {
          coordenadasValidas++;
          coordenadas.minLongitud = Math.min(coordenadas.minLongitud, longitud);
          coordenadas.maxLongitud = Math.max(coordenadas.maxLongitud, longitud);
          coordenadas.minLatitud = Math.min(coordenadas.minLatitud, latitud);
          coordenadas.maxLatitud = Math.max(coordenadas.maxLatitud, latitud);
        }
      }

      const propiedades = feature.properties ?? {};
      bytesSerializadosAprox += JSON.stringify(feature).length;
      for (const [clave, valor] of Object.entries(propiedades)) {
        const tipo = valor === null ? 'null' : Array.isArray(valor) ? 'array' : typeof valor;
        const resumen = tiposPropiedades[clave] ??= {};
        resumen[tipo] = (resumen[tipo] ?? 0) + 1;
        if (typeof valor === 'string') maxCadenaPropiedad = Math.max(maxCadenaPropiedad, valor.length);
      }
    }

    const muestra = features[0];
    const propiedadesMuestra = muestra?.properties ?? {};
    return {
      features: features.length,
      geometrias,
      coordenadasPuntoValidas: coordenadasValidas,
      rangoCoordenadas: coordenadasValidas ? coordenadas : null,
      propiedadesPorTipo: tiposPropiedades,
      bytesSerializadosAprox,
      maxCadenaPropiedad,
      muestra: muestra ? {
        coordenadas: muestra.geometry.type === 'Point' ? muestra.geometry.coordinates : undefined,
        id: propiedadesMuestra['id'],
        tipo: propiedadesMuestra['tipo'],
        nivel: propiedadesMuestra['nivel'],
        color: propiedadesMuestra['color'],
        origen: propiedadesMuestra['origen']
      } : null
    };
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
      COLORES_ALERTAS.vecinal, COLORES_ALERTAS.vecinal,
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
          ['==', ['get', 'origen'], 'vecinal'], ICON_VECINAL,
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
    const resumenVecinal = alerta.origen === 'vecinal'
      ? `<p class="estado-vecinal">${alerta.estadoVecinal === 'confirmado' ? 'Confirmado por vecinos' : 'Sin confirmar'} · ${alerta.votosSigue ?? 0} “sigue ahí” · ${alerta.votosNoEsta ?? 0} “ya no está”</p>
        ${environment.mockReportesVecinales
          ? '<p class="alerta-popup__demo-note">Datos de muestra: las respuestas no se guardan.</p>'
          : `<div class="acciones-vecinales">
              <button class="alerta-popup__button alerta-popup__vote-button" data-respuesta="sigue" type="button">Sigue ahí</button>
              <button class="alerta-popup__button alerta-popup__vote-button" data-respuesta="no_esta" type="button">Ya no está</button>
            </div>
            <p class="alerta-popup__vote-status" aria-live="polite"></p>`}
        ${alerta.fotosPendientes
          ? '<p class="alerta-popup__demo-note" style="color: #64748b;">📷 Fotos en revisión de moderación.</p>'
          : (alerta.cantidadFotos
            ? `<button class="alerta-popup__button alerta-popup__photos-button" type="button">Ver fotos (${alerta.cantidadFotos})</button>
               <p class="alerta-popup__photos-status" aria-live="polite"></p>
               <div class="alerta-popup__photos" hidden></div>`
            : '')}`
      : '';
    const accionDetalle = alerta.origen === 'oficial'
      ? '<button class="alerta-popup__button alerta-popup__detail-button" type="button">Ver alerta completa</button>'
      : '';

    const popup = new Popup({ offset: 25, closeButton: true, closeOnClick: true, maxWidth: 'min(320px, calc(100vw - 32px))' })
      .setLngLat(coordinates)
      .setHTML(`
        <div class="alerta-popup">
          <h3>${titulo}</h3>
          ${this.construirEtiquetaClasificacion(alerta)}
          ${resumen}${resumenMedicionINA}${resumenSismo}
          <div class="fuente">${alerta.origen === 'oficial' ? `✓ ${fuente}` : 'Fuente: Vecinal'}</div>
          ${resumenVecinal}
          ${accionCobertura}
          ${accionDetalle}
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
      void this.router.navigate(['/detalle-alerta', alerta.id]).catch(error => {
        console.error('[Navegación] No se pudo abrir el detalle de la alerta ' + JSON.stringify(diagnosticarError(error)));
      });
    });
    popup.getElement().querySelectorAll<HTMLButtonElement>('.alerta-popup__vote-button').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const respuesta = button.dataset['respuesta'];
        if (respuesta === 'sigue' || respuesta === 'no_esta') {
          void this.votarReporteVecinal(alerta, respuesta, popup.getElement());
        }
      });
    });
    popup.getElement().querySelector<HTMLButtonElement>('.alerta-popup__photos-button')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (alerta.reporteId) void this.cargarFotosReporteVecinal(alerta, popup.getElement());
    });
  }

  private async cargarFotosReporteVecinal(alerta: Alerta, popupElement: HTMLElement): Promise<void> {
    if (!alerta.reporteId) return;
    const boton = popupElement.querySelector<HTMLButtonElement>('.alerta-popup__photos-button');
    const estado = popupElement.querySelector<HTMLElement>('.alerta-popup__photos-status');
    const galeria = popupElement.querySelector<HTMLElement>('.alerta-popup__photos');
    if (!boton || !galeria) return;
    boton.disabled = true;
    if (estado) estado.textContent = 'Cargando fotos…';
    try {
      const fotos = await firstValueFrom(this.alertaService.obtenerFotosReporteVecinal(alerta.reporteId));
      galeria.replaceChildren();
      for (const [indice, foto] of fotos.entries()) {
        const url = new URL(foto.url, location.href);
        const esImagenLocalDeDemo = environment.mockReportesVecinales &&
          url.origin === location.origin &&
          url.pathname.startsWith('/assets/mock-reportes/');
        if (url.protocol !== 'https:' && !esImagenLocalDeDemo) {
          throw new TypeError('El servidor devolvió una URL de imagen no segura.');
        }
        const figura = document.createElement('figure');
        const imagen = document.createElement('img');
        imagen.src = url.href;
        imagen.alt = `Foto ${indice + 1} del reporte vecinal`;
        imagen.loading = 'lazy';
        imagen.addEventListener('error', () => {
          if (estado) estado.textContent = 'No se pudo cargar una de las fotos. Podés volver a intentar.';
          boton.disabled = false;
          boton.textContent = 'Reintentar fotos';
        }, { once: true });
        figura.append(imagen);
        if (foto.originalname) {
          const pie = document.createElement('figcaption');
          pie.textContent = foto.originalname;
          figura.append(pie);
        }
        galeria.append(figura);
      }
      galeria.hidden = fotos.length === 0;
      if (estado) estado.textContent = fotos.length ? '' : 'Este reporte no tiene fotos disponibles.';
      boton.textContent = fotos.length ? `Fotos (${fotos.length})` : 'Sin fotos disponibles';
    } catch (error) {
      if (estado) estado.textContent = 'No se pudieron cargar las fotos. Intentá nuevamente.';
      boton.disabled = false;
      console.error('[Mapa] No se pudieron cargar las fotos del reporte vecinal ' + JSON.stringify({
        id: alerta.reporteId,
        error: diagnosticarError(error)
      }));
    }
  }

  private async votarReporteVecinal(
    alerta: Alerta,
    respuesta: 'sigue' | 'no_esta',
    popupElement: HTMLElement
  ): Promise<void> {
    if (!alerta.reporteId) return;
    const botones = popupElement.querySelectorAll<HTMLButtonElement>('.alerta-popup__vote-button');
    const estado = popupElement.querySelector<HTMLElement>('.alerta-popup__vote-status');
    botones.forEach(button => button.disabled = true);
    if (estado) estado.textContent = 'Enviando tu respuesta…';
    try {
      await firstValueFrom(this.alertaService.votarReporteVecinal(alerta.reporteId, respuesta));
      this.cerrarPopupActivo();
      this.cargarAlertas();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo registrar tu respuesta.';
      if (estado) estado.textContent = mensaje;
      botones.forEach(button => button.disabled = false);
      console.error('[Mapa] No se pudo registrar la respuesta vecinal ' + JSON.stringify({
        id: alerta.reporteId,
        error: diagnosticarError(error)
      }));
    }
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

    const data = this.crearFeatureCollection();
    const revisionDatos = ++this.revisionDatosFuenteAlertas;
    this.registrarDebug('[MapLibre] Actualizando fuente de alertas ' + JSON.stringify({
      generacion: this.generacionFuenteAlertas,
      revisionDatos,
      featuresGeoJSON: data.features.length,
      ...this.resumirGeoJSON(data)
    }));
    void source.setData(data)
      .then(() => {
        this.registrarDebug('[MapLibre] Promesa setData resuelta ' + JSON.stringify({
          generacion: this.generacionFuenteAlertas,
          revisionDatos,
          nota: 'La resolución no confirma por sí sola que los tiles estén cargados; revisar eventos sourcedata y error.'
        }));
        return this.registrarEstadoFuenteAlertas('promesa setData resuelta');
      })
      .catch(error => {
      console.error('[MapLibre] Error al incorporar GeoJSON a la fuente ' + JSON.stringify({
        estilo: this.estiloMapaActual,
        featuresGeoJSON: data.features.length,
        error: diagnosticarError(error)
      }));
      });
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
    if (!this.sesion.ubicacionPermitida()) return;
    const coordenadas = await this.sesion.obtenerCoordenadas();
    if (coordenadas) this.centrarEnCoordenadas(coordenadas);
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

  async centrarEnMiUbicacion(): Promise<void> {
    this.mensajeUbicacion = '';
    const permitida = await this.sesion.pedirUbicacion();
    const coordenadas = permitida ? this.sesion.coordenadas() : null;
    if (!coordenadas) {
      this.mensajeUbicacion = this.sesion.estadoUbicacion() === 'permiso-denegado'
        ? 'Permití el acceso a la ubicación desde los ajustes del celular.'
        : 'No pudimos obtener tu ubicación. Revisá que el GPS esté activado.';
      this.changeDetector.markForCheck();
      return;
    }
    this.centrarEnCoordenadas(coordenadas);
  }

  private centrarEnCoordenadas(coordenadas: { latitud: number; longitud: number }): void {
    this.ubicacionUsuario = coordenadas;
    this.mensajeUbicacion = '';
    this.mostrarUbicacionUsuario();
    this.map?.flyTo({ center: [coordenadas.longitud, coordenadas.latitud], zoom: 15 });
    this.changeDetector.markForCheck();
  }

}
