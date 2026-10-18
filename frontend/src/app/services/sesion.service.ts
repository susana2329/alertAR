import { Injectable, computed, signal } from '@angular/core';

export interface UsuarioSesion {
  id?: string;
  nombre: string;
  apellido?: string;
  email: string;
  foto?: string;
}

@Injectable({ providedIn: 'root' })
export class SesionService {

  usuario = signal<UsuarioSesion | null>(this.leerUsuario());
  ubicacionPermitida = signal(localStorage.getItem('alertar_ubicacion') === 'permitida');

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

  pedirUbicacion(): Promise<boolean> {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          this.guardarUbicacion(true);
          resolve(true);
        },
        (error) => {
          const permitida = error.code !== error.PERMISSION_DENIED;
          this.guardarUbicacion(permitida);
          resolve(permitida);
        },
        { timeout: 10000 }
      );
    });
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