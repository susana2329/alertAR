import { Capacitor } from '@capacitor/core';
import { leerArchivoFoto } from './borrador-reporte.service';

describe('Lectura de fotos nativas', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('lee el archivo nativo completo antes que la miniatura', async () => {
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue('https://localhost/_capacitor_file_/foto.jpg');
    const foto = new Blob(['foto completa'], { type: 'image/jpeg' });
    const descargar = vi.fn().mockResolvedValue({ ok: true, blob: async () => foto });
    vi.stubGlobal('fetch', descargar);

    expect(await leerArchivoFoto({ uri: 'file:///foto.jpg', thumbnail: 'miniatura' })).toBe(foto);
    expect(descargar).toHaveBeenCalledWith('https://localhost/_capacitor_file_/foto.jpg');
  });

  it('rechaza una respuesta fallida en lugar de adjuntarla como imagen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(leerArchivoFoto({ webPath: '/foto.jpg' })).rejects.toThrow('No se pudo leer');
  });
});
