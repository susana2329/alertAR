import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { Position } from '@capacitor/geolocation';
import { SesionService } from './sesion.service';

const geolocationMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(), requestPermissions: vi.fn(), getCurrentPosition: vi.fn()
}));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geolocationMock }));

describe('SesionService geolocalización', () => {
  let service: SesionService;
  let nativeSpy: ReturnType<typeof vi.spyOn>;
  let checkSpy: ReturnType<typeof vi.fn>;
  let requestSpy: ReturnType<typeof vi.fn>;
  let positionSpy: ReturnType<typeof vi.fn>;

  const posicion = {
    coords: { latitude: -28.5, longitude: -59.0, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.now()
  } as Position;

  beforeEach(() => {
    localStorage.clear();
    service = new SesionService();
    nativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    checkSpy = geolocationMock.checkPermissions;
    requestSpy = geolocationMock.requestPermissions;
    positionSpy = geolocationMock.getCurrentPosition;
    checkSpy.mockReset().mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    requestSpy.mockReset().mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    positionSpy.mockReset().mockResolvedValue(posicion);
  });

  afterEach(() => vi.restoreAllMocks());

  it('usa las coordenadas reales cuando el permiso ya está concedido', async () => {
    expect(await service.pedirUbicacion()).toBe(true);
    expect(checkSpy).toHaveBeenCalledOnce();
    expect(requestSpy).not.toHaveBeenCalled();
    expect(positionSpy).toHaveBeenCalledWith({ enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    expect(service.coordenadas()).toEqual({ latitud: -28.5, longitud: -59.0 });
    expect(service.estadoUbicacion()).toBe('disponible');
  });

  it('solicita permiso cuando está pendiente y no consulta posición si se deniega', async () => {
    checkSpy.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    requestSpy.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });
    expect(await service.pedirUbicacion()).toBe(false);
    expect(requestSpy).toHaveBeenCalledOnce();
    expect(positionSpy).not.toHaveBeenCalled();
    expect(service.estadoUbicacion()).toBe('permiso-denegado');
  });

  it('usa ubicación aproximada cuando solo se concedió ese permiso', async () => {
    checkSpy.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' });

    expect(await service.pedirUbicacion()).toBe(true);
    expect(requestSpy).not.toHaveBeenCalled();
    expect(positionSpy).toHaveBeenCalledWith({ enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
  });

  it('prueba la ubicación de red si el GPS preciso agota el tiempo', async () => {
    positionSpy.mockRejectedValueOnce(new Error('OS-PLUG-GLOC-0010: Location request timed out'));

    expect(await service.pedirUbicacion()).toBe(true);
    expect(positionSpy).toHaveBeenCalledTimes(2);
    expect(positionSpy).toHaveBeenNthCalledWith(2, { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
  });

  it('conserva el permiso concedido para reintentar después de un timeout', async () => {
    positionSpy.mockRejectedValue(new Error('OS-PLUG-GLOC-0010: Location request timed out'));
    expect(await service.pedirUbicacion()).toBe(false);
    expect(service.estadoUbicacion()).toBe('timeout');
    expect(service.ubicacionPermitida()).toBe(true);
    expect(localStorage.getItem('alertar_ubicacion')).toBe('permitida');
  });

  it('clasifica errores del proveedor y continúa devolviendo null', async () => {
    positionSpy.mockRejectedValue(new Error('Location services are disabled'));
    expect(await service.obtenerCoordenadas()).toBeNull();
    expect(service.estadoUbicacion()).toBe('servicio-desactivado');
  });

  it('comparte una única solicitud de ubicación entre llamadas concurrentes', async () => {
    let resolver!: (value: typeof posicion) => void;
    positionSpy.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    const primera = service.obtenerCoordenadas();
    const segunda = service.obtenerCoordenadas();
    await Promise.resolve();
    await Promise.resolve();
    expect(positionSpy).toHaveBeenCalledOnce();
    resolver(posicion);
    await expect(Promise.all([primera, segunda])).resolves.toEqual([
      { latitud: -28.5, longitud: -59.0 }, { latitud: -28.5, longitud: -59.0 }
    ]);
    expect(nativeSpy).toHaveBeenCalled();
  });

  it('en web usa navigator.geolocation y captura el permiso denegado', async () => {
    nativeSpy.mockReturnValue(false);
    const webPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
      error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      return 0;
    });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: webPosition } });
    expect(await service.pedirUbicacion()).toBe(false);
    expect(webPosition).toHaveBeenCalledOnce();
    expect(service.estadoUbicacion()).toBe('permiso-denegado');
  });
});
