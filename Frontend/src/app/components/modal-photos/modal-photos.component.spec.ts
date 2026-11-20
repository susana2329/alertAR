import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ModalPhotosComponent } from './modal-photos.component';

const camara = vi.hoisted(() => ({ getPhoto: vi.fn(), takePhoto: vi.fn() }));
vi.mock('@capacitor/camera', () => ({
  Camera: camara, CameraSource: { Camera: 'CAMERA' }, CameraResultType: { Uri: 'uri' }
}));

describe('Cámara en Android', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it('usa la captura que conserva el estado nativo y adjunta el archivo al volver', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    camara.getPhoto.mockResolvedValue({ webPath: '/foto.jpg' });
    const archivo = new Blob(['foto'], { type: 'image/jpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => archivo }));
    const dismiss = vi.fn().mockResolvedValue(undefined);
    const componente = new ModalPhotosComponent({ dismiss } as never);

    await componente.tomarfoto();

    expect(Camera.getPhoto).toHaveBeenCalledWith(expect.objectContaining({ source: CameraSource.Camera, resultType: CameraResultType.Uri }));
    expect(Camera.takePhoto).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledWith([archivo]);
  });
});
