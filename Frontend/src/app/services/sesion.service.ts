import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface UsuarioSesion {
  id?: string;
  nombre: string;
  apellido?: string;
  email: string;
  foto?: string;
}

export interface CoordenadasUsuario {
  latitud: number;
  longitud: number;
}

@Injectable({ providedIn: 'root' })
export class SesionService {

  usuario = signal<UsuarioSesion | null>(this.leerUsuario());
  ubicacionPermitida = signal(localStorage.getItem('alertar_ubicacion') === 'permitida');
  coordenadas = signal<CoordenadasUsuario | null>(null);
  private coordenadasCapturadasEn = 0;

  logueado = computed(() => this.usuario() !== null);

  iniciar(token: string, usuario: UsuarioSesion) {
    localStorage.setItem('alertar_token', token);
    localStorage.setItem('alertar_usuario', JSON.stringify(usuario));
    this.usuario.set(usuario);
  }

  cerrarSesion() {
    localStorage.removeItem('alertar_token');
    localStorage.removeItem('alertar_usuario');
    this.usuario.set(null);
  }

  guardarUbicacion(permitida: boolean) {
    localStorage.setItem('alertar_ubicacion', permitida ? 'permitida' : 'denegada');
    this.ubicacionPermitida.set(permitida);
  }

  async pedirUbicacion(): Promise<boolean> {
    try {
      const coordenadas = await this.consultarPosicion(true);
      if (!coordenadas) {
        this.guardarUbicacion(false);
        return false;
      }
      this.coordenadas.set(coordenadas);
      this.coordenadasCapturadasEn = Date.now();
      this.guardarUbicacion(true);
      return true;
    } catch {
      this.guardarUbicacion(false);
      return false;
    }
  }

  obtenerCoordenadas(): Promise<CoordenadasUsuario | null> {
    const guardadas = this.coordenadas();
    if (guardadas && Date.now() - this.coordenadasCapturadasEn < 60000) return Promise.resolve(guardadas);
    return this.consultarPosicion(false).then(coordenadas => {
      if (coordenadas) {
        this.coordenadas.set(coordenadas);
        this.coordenadasCapturadasEn = Date.now();
        this.guardarUbicacion(true);
      }
      return coordenadas;
    }).catch(() => null);
  }

  private async consultarPosicion(solicitarPermiso: boolean): Promise<CoordenadasUsuario | null> {
    const posicion = Capacitor.isNativePlatform()
      ? this.consultarPosicionNativa(solicitarPermiso)
      : this.consultarPosicionWeb();
    // Algunos WebViews/proveedores de ubicación no llaman los callbacks al vencer timeout.
    // El watchdog garantiza que Inicio continúe consultando alertas aun sin coordenadas.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        posicion,
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 8000); })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async consultarPosicionNativa(solicitarPermiso: boolean): Promise<CoordenadasUsuario | null> {
    let permisos = await Geolocation.checkPermissions();
    if (permisos.location !== 'granted' && solicitarPermiso) {
      permisos = await Geolocation.requestPermissions();
    }
    if (permisos.location !== 'granted') return null;
    const posicion = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 7000 });
    return { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
  }

  private consultarPosicionWeb(): Promise<CoordenadasUsuario | null> {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      posicion => resolve({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude }),
      error => error.code === error.PERMISSION_DENIED ? resolve(null) : reject(error),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 7000 }
    ));
  }

  private leerUsuario(): UsuarioSesion | null {
    try {
      const guardado = localStorage.getItem('alertar_usuario');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  }
}
