import { ReportesFormPage } from './reportes-form.page';

describe('ReportesFormPage', () => {
  function crearPagina() {
    const toast = vi.fn().mockResolvedValue(undefined);
    const pagina = new ReportesFormPage(
      { snapshot: { queryParams: {} } } as never,
      {} as never,
      {} as never,
      {} as never,
      { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } as never,
      { ubicacionPermitida: vi.fn(), obtenerCoordenadas: vi.fn() } as never,
      { resolver: vi.fn() } as never
    );
    pagina.toast = toast;
    const crearModal = vi.spyOn(pagina, 'crearModal').mockResolvedValue();
    return { pagina, toast, crearModal };
  }

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
