import { NEVER, of, throwError } from 'rxjs';
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
    expect(component.errorEnvio()).toBe('');
  });

  it('envía la cantidad de fotos seleccionadas junto a los archivos', async () => {
    const servicio = { postreporte: vi.fn().mockReturnValue(of({})) };
    const component = new ModalConfirmacionComponent(servicio as any, { dismiss: vi.fn() } as any);
    component.reporte = { ...reporte, imagen: [new Blob(['foto'], { type: 'image/jpeg' })] };

    await component.enviar();

    const formulario = servicio.postreporte.mock.calls[0][0] as FormData;
    expect(formulario.get('cantidadFotos')).toBe('1');
    expect(formulario.getAll('fotos')).toHaveLength(1);
  });

  it('mantiene visible la confirmación si falla el envío y permite volver', async () => {
    const servicio = { postreporte: vi.fn().mockReturnValue(throwError(() => new Error('falló'))) };
    const modal = { dismiss: vi.fn().mockResolvedValue(true) };
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new ModalConfirmacionComponent(servicio as any, modal as any);
    component.reporte = reporte;

    await component.enviar();
    expect(modal.dismiss).not.toHaveBeenCalled();
    expect(component.errorEnvio()).toContain('No pudimos enviar');

    await component.cancelar();
    expect(modal.dismiss).toHaveBeenCalledWith({ enviado: false });
    log.mockRestore();
  });

  it('libera la confirmación si la subida queda pendiente', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const servicio = { postreporte: vi.fn().mockReturnValue(NEVER) };
      const modal = { dismiss: vi.fn() };
      const component = new ModalConfirmacionComponent(servicio as any, modal as any);
      component.reporte = reporte;

      const envio = component.enviar();
      await vi.advanceTimersByTimeAsync(45000);
      await envio;

      expect(component.enviando()).toBe(false);
      expect(component.errorEnvio()).toContain('tardó demasiado');
      expect(modal.dismiss).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      vi.useRealTimers();
    }
  });
});
