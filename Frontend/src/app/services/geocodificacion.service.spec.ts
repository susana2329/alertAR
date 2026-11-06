import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { GeocodificacionService } from './geocodificacion.service';

describe('GeocodificacionService', () => {
  let service: GeocodificacionService;
  let http: HttpTestingController;
  const endpoint = `${environment.apiUrl.replace(/\/$/, '')}/geocodificacion/reversa`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GeocodificacionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía coordenadas redondeadas y devuelve localidad y atribución', () => {
    let nombre: string | null = null;
    service.resolver({ latitud: -34.6044, longitud: -58.3812 }).subscribe(resultado => nombre = resultado?.nombre ?? null);
    const req = http.expectOne(request => request.url === endpoint);
    expect(req.request.params.get('latitud')).toBe('-34.604');
    expect(req.request.params.get('longitud')).toBe('-58.381');
    req.flush({ nombre: 'Villa Lugano, Buenos Aires', localidad: 'Villa Lugano', provincia: 'Buenos Aires', proveedor: 'OpenStreetMap', atribucion: '© OpenStreetMap contributors' });
    expect(nombre).toBe('Villa Lugano, Buenos Aires');

    service.resolver({ latitud: -34.6043, longitud: -58.3813 }).subscribe(resultado => expect(resultado?.nombre).toBe(nombre));
    http.expectNone(endpoint);
  });

  it('resuelve null al fallar el proveedor, para permitir fallback de coordenadas', () => {
    let resultado: unknown = 'pendiente';
    service.resolver({ latitud: -34, longitud: -58 }).subscribe(valor => resultado = valor);
    http.expectOne(request => request.url === endpoint).flush({ error: 'fallo' }, { status: 502, statusText: 'Bad Gateway' });
    expect(resultado).toBeNull();
  });
});
