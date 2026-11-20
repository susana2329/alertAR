import { Camera } from '@capacitor/camera';
import { ModalPhotosComponent } from './modal-photos.component';

vi.mock('@capacitor/camera', () => ({
  Camera: { takePhoto: vi.fn(), chooseFromGallery: vi.fn() }
}));

describe('ModalPhotosComponent', () => {
  it('muestra un error y conserva el modal si la foto no puede leerse', async () => {
    const modal = { dismiss: vi.fn() };
    const pagina = new ModalPhotosComponent(modal as never);
    vi.mocked(Camera.takePhoto).mockResolvedValue({} as never);
    const leerFoto = vi.spyOn(pagina, 'obtenerBlobDeFoto').mockResolvedValue(null);

    try {
      await pagina.tomarfoto();
      expect(pagina.errorFoto).toContain('No se pudo leer');
      expect(modal.dismiss).not.toHaveBeenCalled();
    } finally {
      vi.mocked(Camera.takePhoto).mockReset();
      leerFoto.mockRestore();
    }
  });
});
