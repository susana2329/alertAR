import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { InicioPage } from './inicio.page';
import { EventoInicio, InicioService, RespuestaInicio } from '../../services/inicio.service';
import { GeocodificacionService, UbicacionLegible } from '../../services/geocodificacion.service';
import { SesionService } from '../../services/sesion.service';

describe('InicioPage', () => {
  let fixture: ComponentFixture<InicioPage>;
  let service: { obtener: ReturnType<typeof vi.fn> };
  let geocodificacion: { resolver: ReturnType<typeof vi.fn> };
  let sesion: { ubicacionPermitida: ReturnType<typeof signal<boolean>>; obtenerCoordenadas: ReturnType<typeof vi.fn>; pedirUbicacion: ReturnType<typeof vi.fn> };

  const evento = {
    id: 'smn-1', titulo: 'Tormentas', tipo: 'tormenta', nivel: 'advertencia', origen: 'oficial', fuente: 'SMN',
    naturaleza: 'alerta', descripcion: 'Alerta activa', fechaInicio: '2026-11-05T10:00:00Z', fechaFin: '2026-11-05T16:00:00Z',
    fechaActualizacion: '2026-11-05T10:00:00Z', ubicacion: null, geometria: null, distanciaKm: 0,
    dentroDelArea: true, calidadDatos: 80, relevancia: 100, informacionPreventiva: null, recomendacionesDisponibles: false
  } as unknown as EventoInicio;

  function respuesta(destacada: EventoInicio | null = evento, eventos: EventoInicio[] = [evento]): RespuestaInicio {
    return { ubicacion: { latitud: -34.6, longitud: -58.4 }, actualizadoEn: '2026-11-05T10:00:00Z', estado: destacada ? 'alerta' : 'sin-situaciones-relevantes', destacada, eventos, mensaje: destacada ? null : 'No hay alertas relevantes.' };
  }

  async function crearPage(permitida: boolean, resultado = of(respuesta()), geocode: Observable<UbicacionLegible | null> = of(null)) {
    service = { obtener: vi.fn().mockReturnValue(resultado) };
    geocodificacion = { resolver: vi.fn().mockReturnValue(geocode) };
    sesion = {
      ubicacionPermitida: signal(permitida),
      obtenerCoordenadas: vi.fn().mockResolvedValue({ latitud: -34.6, longitud: -58.4 }),
      pedirUbicacion: vi.fn().mockResolvedValue(false)
    };
    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        provideRouter([]),
        { provide: InicioService, useValue: service },
        { provide: GeocodificacionService, useValue: geocodificacion },
        { provide: SesionService, useValue: sesion }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(InicioPage);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('carga alertas con ubicación sin esperar una geocodificación que no responde', async () => {
    await crearPage(true, of(respuesta()), NEVER);
    expect(fixture.componentInstance.cargando).toBe(false);
    expect(fixture.componentInstance.destacada?.id).toBe('smn-1');
    expect(service.obtener).toHaveBeenCalledWith({ latitud: -34.6, longitud: -58.4 });
    expect(geocodificacion.resolver).toHaveBeenCalled();
  });

  it('termina con estado vacío cuando no hay alertas relevantes', async () => {
    await crearPage(true, of(respuesta(null, [])));
    expect(fixture.componentInstance.cargando).toBe(false);
    expect(fixture.componentInstance.errorCarga).toBeNull();
    expect(fixture.componentInstance.alertasCercanas).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No se detectan situaciones importantes');
  });

  it('sin permiso consulta alertas globales y muestra el estado de ubicación', async () => {
    await crearPage(false, of({ ...respuesta(null, []), ubicacion: null }));
    expect(fixture.componentInstance.cargando).toBe(false);
    expect(sesion.obtenerCoordenadas).not.toHaveBeenCalled();
    expect(service.obtener).toHaveBeenCalledWith(undefined);
    expect(fixture.componentInstance.mensajeSinUbicacion).toContain('Activá tu ubicación');
  });

  it('termina y muestra error diferenciado si falla la API de inicio', async () => {
    await crearPage(true, throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(fixture.componentInstance.cargando).toBe(false);
    expect(fixture.componentInstance.errorCarga).toContain('No se pudo conectar');
  });

  it('conserva coordenadas y alertas si falla geocodificación inversa', async () => {
    await crearPage(true);
    geocodificacion.resolver.mockReturnValue(of(null));
    await fixture.componentInstance.cargarInicio();
    expect(fixture.componentInstance.ubicacion).toBe('-34.6000, -58.4000');
    expect(fixture.componentInstance.destacada?.id).toBe('smn-1');
    expect(fixture.componentInstance.cargando).toBe(false);
  });

  it('muestra localidad/provincia y atribución del geocodificador cuando hay resultado', async () => {
    await crearPage(true, of(respuesta()), of({
      nombre: 'Villa Lugano, Buenos Aires', localidad: 'Villa Lugano', provincia: 'Buenos Aires',
      proveedor: 'OpenStreetMap', atribucion: '© OpenStreetMap contributors'
    }));
    expect(fixture.componentInstance.ubicacion).toBe('Villa Lugano, Buenos Aires');
    expect(fixture.componentInstance.ubicacionAtribucion).toBe('© OpenStreetMap contributors');
    expect(fixture.nativeElement.textContent).toContain('Villa Lugano, Buenos Aires');
  });
});
