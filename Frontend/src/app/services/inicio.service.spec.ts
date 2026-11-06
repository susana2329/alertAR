import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { InicioService } from './inicio.service';

describe('InicioService', () => {
  let service: InicioService;
  let http: HttpTestingController;
  const endpoint = `${environment.apiUrl.replace(/\/$/, '')}/inicio`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InicioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el inicio con ubicación sin cambiar el endpoint de alertas', () => {
    service.obtener({ latitud: -34.6, longitud: -58.4 }).subscribe(respuesta => {
      expect(respuesta.destacada?.id).toBe('alerta-1');
    });
    const req = http.expectOne(request => request.url === endpoint);
    expect(req.request.params.get('latitud')).toBe('-34.6');
    expect(req.request.params.get('longitud')).toBe('-58.4');
    req.flush({ ubicacion: { latitud: -34.6, longitud: -58.4 }, actualizadoEn: new Date().toISOString(), estado: 'alerta', destacada: { id: 'alerta-1' }, eventos: [], mensaje: null });
    http.expectNone(`${environment.apiUrl.replace(/\/$/, '')}/alertas`);
  });

  it('permite solicitar alertas oficiales sin personalización por ubicación', () => {
    service.obtener().subscribe();
    const req = http.expectOne(endpoint);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ ubicacion: null, actualizadoEn: new Date().toISOString(), estado: 'sin-situaciones-relevantes', destacada: null, eventos: [], mensaje: 'Sin alertas' });
  });
});
