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
  const endpoint = `${environment.apiUrl.replace(/\/$/, '')}/alertas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AlertaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
});
