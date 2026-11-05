import { of, throwError } from 'rxjs';
import { ModalConfirmacionComponent } from './modal-confirmacion.component';

const reporte = {
  tipo: 'inundacion',
  descripcion: 'Agua en la calle',
  ubicacion: 'Lugano',
  fecha: new Date('2026-11-05T12:00:00Z'),
  imagen: [],
  fotos: [],
  estado: 'En revicion' as const
};

describe('ModalConfirmacionComponent', () => {
  it('cierra con éxito solo después de completar el envío', async () => {
    const servicio = { postreporte: vi.fn().mockReturnValue(of({})) };
    const modal = { dismiss: vi.fn().mockResolvedValue(true) };
    const component = new ModalConfirmacionComponent(servicio as any, modal as any);
    component.reporte = reporte;

    await component.enviar();

    expect(servicio.postreporte).toHaveBeenCalledOnce();
    expect(modal.dismiss).toHaveBeenCalledWith({ enviado: true });
    expect(component.errorEnvio).toBe('');
  });

  it('mantiene visible la confirmación si falla el envío y permite volver', async () => {
    const servicio = { postreporte: vi.fn().mockReturnValue(throwError(() => new Error('falló'))) };
    const modal = { dismiss: vi.fn().mockResolvedValue(true) };
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new ModalConfirmacionComponent(servicio as any, modal as any);
    component.reporte = reporte;

    await component.enviar();
    expect(modal.dismiss).not.toHaveBeenCalled();
    expect(component.errorEnvio).toContain('No pudimos enviar');

    await component.cancelar();
    expect(modal.dismiss).toHaveBeenCalledWith({ enviado: false });
    log.mockRestore();
  });
});
