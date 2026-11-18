import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { Alerta } from '../models/alerta.model';
import { environment } from '../../environments/environment';
import { AlertaService } from './alerta.service';

describe('AlertaService', () => {
  let service: AlertaService;
  let http: HttpTestingController;
  let mockReportesVecinalesOriginal: boolean;
  const endpoint = `${environment.apiUrl.replace(/\/$/, '')}/alertas`;
  const reportesEndpoint = `${environment.apiUrl.replace(/\/api\/?$/, '')}/reportes/reporte`;

  beforeEach(() => {
    mockReportesVecinalesOriginal = environment.mockReportesVecinales;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AlertaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.mockReportesVecinales = mockReportesVecinalesOriginal;
    http.verify();
  });

  it('resolves the selected alert from the list already loaded by the map', () => {
    const alerta: Alerta = {
      id: 'smn-alert-id',
      titulo: 'Tormentas',
      tipo: 'meteorologica',
      nivel: 'advertencia',
      origen: 'oficial',
      fuente: 'SMN',
      descripcion: 'Descripción completa recibida del backend.',
      fechaInicio: null,
      fechaFin: null,
      ubicacion: { latitud: -34, longitud: -58 },
      geometria: null
    };

    service.listar().subscribe();
    http.expectOne(endpoint).flush([alerta]);

    let detalle: Alerta | undefined;
    service.obtenerPorId(alerta.id).subscribe((resultado) => {
      detalle = resultado;
    });

    http.expectNone(endpoint);
    expect(detalle).toEqual(alerta);
    expect(detalle?.descripcion).toBe(alerta.descripcion);
  });

  it('acepta nuevos niveles, tipos, MultiPolygon y datos descriptivos del backend', () => {
    const alerta: Alerta = {
      id: 'ina-observacion', titulo: 'Estación', tipo: 'nevada', nivel: 'desconocido',
      origen: 'oficial', naturaleza: 'observacion', etiqueta: 'DESCONOCIDO', color: 'neutro',
      descripcion: 'Vista previa…', descripcionPreview: 'Vista previa…',
      descripcionCompleta: 'Descripción íntegra de la observación.', detalle: { medicion: { valor: 3 } },
      fechaInicio: null, fechaFin: null, ubicacion: null,
      geometria: { type: 'MultiPolygon', coordinates: [[[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]]] }
    };
    service.listar().subscribe((alertas) => expect(alertas[0]).toEqual(alerta));
    http.expectOne(endpoint).flush([alerta]);
  });

  it('carga los resúmenes mediante el endpoint dedicado del mapa', () => {
    service.listarParaMapa().subscribe(alertas => expect(alertas).toEqual([]));
    http.expectOne(`${endpoint}/mapa`).flush([]);
  });

  it('sirve reportes vecinales de muestra sin consultar la API en modo demo', () => {
    environment.mockReportesVecinales = true;
    service.listarParaMapa().subscribe(alertas => {
      expect(alertas.length).toBeGreaterThan(0);
      expect(alertas.every(alerta => alerta.origen === 'vecinal')).toBe(true);
      expect(alertas.some(alerta => (alerta.cantidadFotos ?? 0) > 0)).toBe(true);
    });

    http.expectNone(`${endpoint}/mapa`);
  });

  it('rechaza una respuesta de mapa que no cumple el contrato de arreglo', () => {
    let error: unknown;
    service.listarParaMapa().subscribe({ error: value => error = value });
    http.expectOne(`${endpoint}/mapa`).flush({ alertas: [] });
    expect(error).toBeInstanceOf(TypeError);
  });

  it('recupera el documento completo por id si solo se consultó el resumen del mapa', () => {
    service.listarParaMapa().subscribe();
    http.expectOne(`${endpoint}/mapa`).flush([]);
    const alerta: Alerta = {
      id: 'ina-1', titulo: 'Estación', tipo: 'crecida', nivel: 'informativo', origen: 'oficial',
      fuente: 'INA', descripcion: 'Detalle', fechaInicio: null, fechaFin: null,
      ubicacion: null, geometria: null, detalle: { serieTemporal: [1, 2, 3] }
    };
    service.obtenerPorId(alerta.id).subscribe(resultado => expect(resultado).toEqual(alerta));
    http.expectOne(`${endpoint}/${alerta.id}`).flush(alerta);
  });

  it('envía la respuesta vecinal con la sesión iniciada', () => {
    localStorage.setItem('alertar_token', 'token-de-prueba');
    service.votarReporteVecinal('reporte-1', 'sigue').subscribe(resultado => {
      expect(resultado.estadoVecinal).toBe('sin_confirmar');
    });

    const request = http.expectOne(`${reportesEndpoint}/reporte-1/voto`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(request.request.body).toEqual({ respuesta: 'sigue' });
    request.flush({ estadoVecinal: 'sin_confirmar' });
    localStorage.removeItem('alertar_token');
  });

  it('carga las fotos de un reporte vecinal solo cuando se solicitan', () => {
    service.obtenerFotosReporteVecinal('reporte-1').subscribe(fotos => {
      expect(fotos).toEqual([{ url: 'https://s3.example/foto?firma=temporal' }]);
    });

    const request = http.expectOne(`${reportesEndpoint}/reporte-1/imagenes`);
    expect(request.request.method).toBe('GET');
    request.flush([{ url: 'https://s3.example/foto?firma=temporal' }]);
  });

  it('devuelve fotos locales de muestra sin consultar S3 en modo demo', () => {
    environment.mockReportesVecinales = true;
    service.obtenerFotosReporteVecinal('demo-1').subscribe(fotos => {
      expect(fotos).toHaveLength(2);
      expect(fotos[0].url).toBe('/assets/mock-reportes/calle-inundada.svg');
    });

    http.expectNone(`${reportesEndpoint}/demo-1/imagenes`);
  });
});
