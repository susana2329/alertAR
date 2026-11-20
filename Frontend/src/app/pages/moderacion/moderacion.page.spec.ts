import { of } from 'rxjs';
import { ModeracionPage } from './moderacion.page';

describe('ModeracionPage', () => {
  it('vuelve a consultar los pendientes cada vez que se abre la página', () => {
    const moderacion = { listarPendientes: vi.fn(() => of([])) };
    const sesion = { esModerador: vi.fn(() => true) };
    const cambio = { markForCheck: vi.fn() };
    const pagina = new ModeracionPage(
      moderacion as never,
      sesion as never,
      {} as never,
      {} as never,
      {} as never,
      cambio as never
    );

    pagina.ionViewWillEnter();
    pagina.ionViewWillEnter();

    expect(moderacion.listarPendientes).toHaveBeenCalledTimes(2);
    expect(pagina.reportes).toEqual([]);
    expect(pagina.cargando).toBe(false);
  });
});
