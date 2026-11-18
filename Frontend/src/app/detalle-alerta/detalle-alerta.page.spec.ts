import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DetalleAlertaPage } from './detalle-alerta.page';
import { AlertaService } from '../services/alerta.service';
import { Alerta } from '../models/alerta.model';

describe('DetalleAlertaPage', () => {
  let component: DetalleAlertaPage;
  let fixture: ComponentFixture<DetalleAlertaPage>;
  let ruta$: Subject<ParamMap>;
  let respuesta$: Subject<Alerta | undefined>;
  let respuestaError$: Subject<Alerta | undefined>;
  let respuestaNoEncontrada$: Subject<Alerta | undefined>;

  beforeEach(() => {
    ruta$ = new Subject<ParamMap>();
    respuesta$ = new Subject<Alerta | undefined>();
    respuestaError$ = new Subject<Alerta | undefined>();
    respuestaNoEncontrada$ = new Subject<Alerta | undefined>();
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: ruta$.asObservable() } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      { provide: AlertaService, useValue: {
        obtenerPorId: (id: string) => (id === 'error' ? respuestaError$
          : id === 'inexistente' ? respuestaNoEncontrada$ : respuesta$).asObservable()
      } }
    ] });
    fixture = TestBed.createComponent(DetalleAlertaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function cargar(alerta: Partial<Alerta>): void {
    component.alerta = {
      id: 'test', titulo: 'Evento de prueba', tipo: 'observacion', nivel: 'informativo',
      origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null,
      ubicacion: null, geometria: null, ...alerta
    } as Alerta;
  }

  it('mantiene visible el estado de carga mientras espera la respuesta HTTP', () => {
    expect(component).toBeTruthy();
    expect(component.cargando).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando alerta');
  });

  it('sale de carga y renderiza el detalle recibido por la API', () => {
    const marcaDeteccion = vi.spyOn((component as any).changeDetector, 'markForCheck');
    ruta$.next(convertToParamMap({ id: 'alerta-1' }));
    expect(component.cargando).toBe(true);
    respuesta$.next({
      id: 'alerta-1', titulo: 'Tormenta severa', tipo: 'tormenta', nivel: 'advertencia',
      origen: 'oficial', fuente: 'SMN', descripcion: 'Descripción oficial',
      descripcionCompleta: 'Descripción oficial', fechaInicio: '2026-11-05T10:00:00.000Z',
      fechaFin: '2026-11-05T12:00:00.000Z', ubicacion: null, geometria: null,
      detalle: { estadoFuente: 'Actual', tipoMensaje: 'Alert', datosFuente: { informaciones: [{ instruccion: 'Seguir los avisos.' }] } }
    });
    fixture.detectChanges();

    expect(component.cargando).toBe(false);
    expect(component.errorCarga).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Tormenta severa');
    expect(fixture.nativeElement.textContent).toContain('Seguir los avisos.');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando alerta');
    expect(marcaDeteccion).toHaveBeenCalled();
  });

  it('sale de carga y muestra el estado de error ante una falla HTTP', () => {
    ruta$.next(convertToParamMap({ id: 'error' }));
    respuestaError$.error(new HttpErrorResponse({ status: 0, statusText: 'Network error' }));
    fixture.detectChanges();

    expect(component.cargando).toBe(false);
    expect(component.errorCarga).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la alerta');
  });

  it('trata el HTTP 404 como alerta inexistente y no como error de conexión', () => {
    ruta$.next(convertToParamMap({ id: 'inexistente' }));
    respuestaNoEncontrada$.error(new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
    fixture.detectChanges();

    expect(component.cargando).toBe(false);
    expect(component.errorCarga).toBe(false);
    expect(component.alerta).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('No se encontró la alerta solicitada');
  });

  it('presenta lectura INA con fecha y separa la fecha de medición del inicio del evento', () => {
    cargar({
      fuente: 'INA', tipo: 'observacion', nivel: 'advertencia', naturaleza: 'alerta',
      color: 'naranja', fechaInicio: '2026-10-23T12:00:00.000Z',
      descripcion: 'La altura registrada está en aumento. Medición: 4.25 m.',
      detalle: {
        estacion: { nombre: 'Estación Río', rio: 'Río Claro' },
        medicion: { fecha: '2026-10-23T12:00:00.000Z', valor: 4.25, unidad: 'm', tendencia: 'crece' },
        umbrales: { alerta: 4, evacuacion: 5, aguasBajas: null, unidad: 'm' }
      }
    });

    expect(component.esINA).toBe(true);
    expect(component.medicionINA).toEqual({
      fecha: '2026-10-23T12:00:00.000Z', valor: 4.25, unidad: 'm', valorPrecedente: null, tendencia: 'crece'
    });
    expect(component.formatearFecha(component.medicionINA?.fecha)).toBeTruthy();
    expect(component.umbralesINA).toEqual([
      { etiqueta: 'Referencia de alerta', valor: 4, unidad: 'm' },
      { etiqueta: 'Referencia de evacuación', valor: 5, unidad: 'm' }
    ]);
    expect(component.estacionINA).toBe('Estación Río · Río Claro');
    expect(component.etiquetaPresentacion).toBe('ALERTA');
    expect(component.colorClasificacionINA).toBe('naranja');
    expect(component.descripcionVisible).toContain('altura registrada');
    expect(component.descripcionVisible).not.toContain('Medición:');
    expect(component.alerta?.fechaFin).toBeNull();
  });

  it('mapea la escala completa sin confundir datos desconocidos con observaciones informativas', () => {
    const casos = [
      { nivel: 'informativo', color: 'azul', etiqueta: 'INFORMATIVO' },
      { nivel: 'precaucion', color: 'amarillo', etiqueta: 'PRECAUCIÓN' },
      { nivel: 'advertencia', color: 'naranja', etiqueta: 'ALERTA' },
      { nivel: 'emergencia', color: 'rojo', etiqueta: 'EMERGENCIA' }
    ] as const;
    for (const caso of casos) {
      cargar({ fuente: 'INA', nivel: caso.nivel, naturaleza: caso.nivel === 'informativo' ? 'observacion' : 'alerta' });
      expect(component.colorEstadoVisual).toBe(caso.color);
      expect(component.etiquetaPresentacion).toBe(caso.etiqueta);
    }

    cargar({ fuente: 'SMN', nivel: 'desconocido', naturaleza: 'observacion', color: 'azul' });
    expect(component.colorEstadoVisual).toBe('neutro');
    expect(component.etiquetaPresentacion).toBe('DESCONOCIDO');

    cargar({ fuente: 'SMN', nivel: 'precaucion', naturaleza: 'alerta', color: 'amarillo', etiqueta: 'PRECAUCIÓN' });
    expect(component.colorEstadoVisual).toBe('amarillo');
    expect(component.etiquetaPresentacion).toBe('PRECAUCIÓN');

    cargar({ fuente: 'SMN', nivel: 'informativo', naturaleza: 'observacion', color: 'turquesa' });
    expect(component.colorEstadoVisual).toBe('azul');
  });

  it('distingue fecha de ocurrencia y clasificación informativa del registro sísmico INPRES', () => {
    cargar({
      fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo', naturaleza: 'observacion',
      fechaInicio: '2026-10-23T12:30:00.000Z', fechaFin: null,
      detalle: { magnitud: 3.4, profundidad: 192, provincia: 'Mendoza', fechaHoraIdentificador: '2026-10-23T12:30:00' }
    });

    expect(component.esINPRES).toBe(true);
    expect(component.fechaOcurrencia).toBe('2026-10-23T12:30:00.000Z');
    expect(component.magnitudSismo).toBe(3.4);
    expect(component.profundidadSismo).toBe(192);
    expect(component.provinciaINPRES).toBe('Mendoza');
    expect(component.etiquetaPresentacion).toBe('INFORMATIVO');
    expect(component.alerta?.fechaFin).toBeNull();
  });

  it('expone vigencia y datos específicos del CAP de SMN', () => {
    cargar({
      fuente: 'SMN', tipo: 'tormenta', nivel: 'advertencia', naturaleza: 'alerta',
      fechaInicio: '2026-10-28T10:00:00.000Z', fechaFin: '2026-10-28T16:00:00.000Z',
      descripcion: 'Tormentas fuertes.', detalle: {
        estadoFuente: 'Actual', tipoMensaje: 'Alert',
        datosFuente: {
          informaciones: [{ instruccion: 'Seguir los avisos oficiales.' }],
          areas: [{ descripcion: 'Norte de Mendoza', geometrías: [{ type: 'Polygon' }] }, { descripcion: null, geometrías: [] }]
        }
      }
    });

    expect(component.esSMN).toBe(true);
    expect(component.estadoSMN).toBe('Actual');
    expect(component.tipoMensajeSMN).toBe('Alert');
    expect(component.instruccionSMN).toBe('Seguir los avisos oficiales.');
    expect(component.areasSMN).toEqual(['Norte de Mendoza']);
    expect(component.alerta?.fechaInicio).toBe('2026-10-28T10:00:00.000Z');
    expect(component.alerta?.fechaFin).toBe('2026-10-28T16:00:00.000Z');
  });

  it('oculta datos opcionales ausentes y rechaza métricas sísmicas inválidas', () => {
    cargar({ fuente: 'INA', detalle: { medicion: { fecha: null, valor: null, tendencia: null } } });
    expect(component.medicionINA).toEqual({ fecha: null, valor: null, unidad: null, valorPrecedente: null, tendencia: null });
    expect(component.umbralesINA).toEqual([]);
    expect(component.estacionINA).toBeNull();

    cargar({ fuente: 'INPRES', tipo: 'sismo', detalle: { magnitud: '3.4', profundidad: -2 } });
    expect(component.magnitudSismo).toBeNull();
    expect(component.profundidadSismo).toBeNull();
    expect(component.urlFuenteINPRES).toBeNull();
  });

});
