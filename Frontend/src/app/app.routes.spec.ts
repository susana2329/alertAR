import { routes } from './app.routes';
import { DetalleAlertaPage } from './detalle-alerta/detalle-alerta.page';

describe('rutas de navegación', () => {
  it('resuelve la ruta del detalle de alerta seleccionada', async () => {
    const route = routes.find(candidate => candidate.path === 'detalle-alerta/:id');
    expect(route?.loadComponent).toBeDefined();
    await expect(route!.loadComponent!()).resolves.toBe(DetalleAlertaPage);
  });

  it('envía la sección de mochila a una ruta existente', () => {
    expect(routes.some(route => route.path === 'prevencion/mochila')).toBe(true);
  });
});
