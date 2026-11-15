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

export type EstadoUbicacion = 'disponible' | 'permiso-denegado' | 'servicio-desactivado' | 'timeout' | 'error' | null;

@Injectable({ providedIn: 'root' })
export class SesionService {

  usuario = signal<UsuarioSesion | null>(this.leerUsuario());
  ubicacionPermitida = signal(localStorage.getItem('alertar_ubicacion') === 'permitida');
  coordenadas = signal<CoordenadasUsuario | null>(null);
  estadoUbicacion = signal<EstadoUbicacion>(null);
  private coordenadasCapturadasEn = 0;
  private solicitudEnCurso: Promise<CoordenadasUsuario | null> | null = null;

  logueado = computed(() => this.usuario() !== null);

  iniciar(token: string, usuario: UsuarioSesion) {
    localStorage.setItem('alertar_token', token);
    localStorage.setItem('alertar_usuario', JSON.stringify(usuario));
    this.usuario.set(usuario);
  }
    
  obtenerToken(): string | null {
    return localStorage.getItem('alertar_token');
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
      if (!coordenadas) return false;
      this.coordenadas.set(coordenadas);
      this.coordenadasCapturadasEn = Date.now();
      this.guardarUbicacion(true);
      return true;
    } catch {
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

  private consultarPosicion(solicitarPermiso: boolean): Promise<CoordenadasUsuario | null> {
    if (this.solicitudEnCurso) return this.solicitudEnCurso;
    this.solicitudEnCurso = this.consultarPosicionUnica(solicitarPermiso).finally(() => {
      this.solicitudEnCurso = null;
    });
    return this.solicitudEnCurso;
  }

  private async consultarPosicionUnica(solicitarPermiso: boolean): Promise<CoordenadasUsuario | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const posicion = Capacitor.isNativePlatform()
        ? this.consultarPosicionNativa(solicitarPermiso)
        : this.consultarPosicionWeb();
      return await Promise.race([
        posicion,
        new Promise<null>(resolve => { timer = setTimeout(() => {
          this.estadoUbicacion.set('timeout');
          resolve(null);
        }, Capacitor.isNativePlatform() ? 23000 : 12000); })
      ]);
    } catch (error) {
      this.estadoUbicacion.set(this.esTimeout(error) ? 'timeout' : this.esServicioDesactivado(error) ? 'servicio-desactivado' : 'error');
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async consultarPosicionNativa(solicitarPermiso: boolean): Promise<CoordenadasUsuario | null> {
    let permisos = await Geolocation.checkPermissions();
    if (permisos.location !== 'granted' && solicitarPermiso) {
      permisos = await Geolocation.requestPermissions();
    }
    if (permisos.location !== 'granted') {
      this.estadoUbicacion.set('permiso-denegado');
      this.guardarUbicacion(false);
      return null;
    }
    // Precisión alta ayuda al GPS simulado y al primer fix en Android. No reutilizar
    // una posición antigua aquí: una coordenada vieja puede personalizar alertas mal.
    const posicion = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    this.estadoUbicacion.set('disponible');
    return this.validarCoordenadas(posicion.coords.latitude, posicion.coords.longitude);
  }

  private consultarPosicionWeb(): Promise<CoordenadasUsuario | null> {
    if (!navigator.geolocation) {
      this.estadoUbicacion.set('error');
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      posicion => {
        this.estadoUbicacion.set('disponible');
        resolve(this.validarCoordenadas(posicion.coords.latitude, posicion.coords.longitude));
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          this.estadoUbicacion.set('permiso-denegado');
          this.guardarUbicacion(false);
          resolve(null);
        } else {
          this.estadoUbicacion.set(error.code === error.TIMEOUT ? 'timeout' : 'error');
          reject(error);
        }
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 }
    ));
  }

  private validarCoordenadas(latitud: number, longitud: number): CoordenadasUsuario | null {
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
      this.estadoUbicacion.set('error');
      return null;
    }
    return { latitud, longitud };
  }

  private esServicioDesactivado(error: unknown): boolean {
    const mensaje = this.mensajeError(error);
    return /location.*(disabled|turned off)|location services/i.test(mensaje);
  }

  private esTimeout(error: unknown): boolean {
    const mensaje = this.mensajeError(error);
    return /timeout|timed out|OS-PLUG-GLOC-0010/i.test(mensaje);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) return String(error.message);
    return String(error);
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
