import { ReportesFormPage } from './reportes-form.page';
import { of } from 'rxjs';

describe('ReportesFormPage', () => {
  function crearPagina() {
    const toast = vi.fn().mockResolvedValue(undefined);
    const sesion = { ubicacionPermitida: vi.fn().mockReturnValue(false), pedirUbicacion: vi.fn().mockResolvedValue(true), obtenerCoordenadas: vi.fn().mockResolvedValue({ latitud: -34.6, longitud: -58.4 }) };
    const geocodificacion = { resolver: vi.fn().mockReturnValue(of(null)) };
    const route = { snapshot: { queryParams: {} as Record<string, string> } };
    const borrador = { guardar: vi.fn(), recuperar: vi.fn(), limpiar: vi.fn().mockResolvedValue(undefined) };
    const pagina = new ReportesFormPage(
      route as never,
      {} as never,
      {} as never,
      {} as never,
      { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } as never,
      sesion as never,
      geocodificacion as never,
      borrador as never
    );
    pagina.toast = toast;
    const crearModal = vi.spyOn(pagina, 'crearModal').mockResolvedValue();
    return { pagina, toast, crearModal, sesion, geocodificacion, route, borrador };
  }

  it('recupera el formulario tras volver de la cámara sin sobrescribir su ubicación', async () => {
    const { pagina, route, borrador, sesion } = crearPagina();
    route.snapshot.queryParams['recuperarFoto'] = '1';
    borrador.recuperar.mockResolvedValue({ ...pagina.reporte, tipo: 'incendio', descripcion: 'Humo', coordenadas: { latitud: -34, longitud: -58 } });

    await pagina.ngOnInit();

    expect(pagina.reporte.descripcion).toBe('Humo');
    expect(pagina.tipo).toBe('incendio');
    expect(pagina.reporte.coordenadas).toEqual({ latitud: -34, longitud: -58 });
    expect(sesion.obtenerCoordenadas).not.toHaveBeenCalled();
    expect(borrador.limpiar).toHaveBeenCalledOnce();
  });

  it('vuelve a pedir permiso al tocar ubicación y conserva coordenadas si falla la geocodificación', async () => {
    const { pagina, sesion } = crearPagina();

    await pagina.cargarUbicacion(true);

    expect(sesion.pedirUbicacion).toHaveBeenCalledOnce();
    expect(pagina.reporte.coordenadas).toEqual({ latitud: -34.6, longitud: -58.4 });
    expect(pagina.reporte.ubicacion).toBe('-34.60000, -58.40000');
  });

  it('limpia coordenadas anteriores si falla una nueva solicitud', async () => {
    const { pagina, sesion } = crearPagina();
    pagina.reporte.coordenadas = { latitud: -35, longitud: -58 };
    sesion.pedirUbicacion.mockResolvedValue(false);

    await pagina.cargarUbicacion(true);

    expect(pagina.reporte.coordenadas).toBeNull();
  });

  it('bloquea el envío sin coordenadas aunque haya texto descriptivo de ubicación', async () => {
    const { pagina, toast, crearModal } = crearPagina();
    pagina.reporte.ubicacion = 'Dirección escrita por el usuario';

    await pagina.confirmarreport();

    expect(crearModal).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Volvé a intentar obtener tu ubicación'));
  });

  it('acepta latitud y longitud iguales a cero', async () => {
    const { pagina, crearModal } = crearPagina();
    pagina.reporte.coordenadas = { latitud: 0, longitud: 0 };
    pagina.reporte.descripcion = 'Incidente';

    await pagina.confirmarreport();

    expect(crearModal).toHaveBeenCalledOnce();
  });

  it('bloquea coordenadas fuera de rango o no finitas', async () => {
    for (const coordenadas of [
      { latitud: 91, longitud: 0 },
      { latitud: 0, longitud: -181 },
      { latitud: Number.NaN, longitud: 0 },
      { latitud: 0, longitud: Number.POSITIVE_INFINITY }
    ]) {
      const { pagina, crearModal } = crearPagina();
      pagina.reporte.coordenadas = coordenadas;

      await pagina.confirmarreport();

      expect(crearModal).not.toHaveBeenCalled();
    }
  });
});
