import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionService, UsuarioSesion } from './sesion.service';

export interface RespuestaAuth {
  token: string;
  usuario: UsuarioSesion;
}

export interface RegistroDatos {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface LoginDatos {
  email: string;
  password: string;
}

export type EstadoVerificacionSesion = 'sin-sesion' | 'vigente' | 'invalida' | 'no-verificada' | 'obsoleta';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly httpSinInterceptores = new HttpClient(inject(HttpBackend));
  private readonly sesion = inject(SesionService);
  private readonly apiUrl = `${environment.apiUrl.replace(/\/$/, '')}/auth`;

  login(credenciales: LoginDatos): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res) => {
        this.sesion.iniciar(res.token, res.usuario);
      })
    );
  }

  registro(datos: RegistroDatos): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.apiUrl}/registro`, datos).pipe(
      tap((res) => {
        this.sesion.iniciar(res.token, res.usuario);
      })
    );
  }

  async verificarSesion(): Promise<EstadoVerificacionSesion> {
    const token = this.sesion.obtenerToken();
    if (!token) return 'sin-sesion';

    if (!this.sesion.tokenValido()) {
      if (this.sesion.obtenerToken() !== token) return 'obsoleta';
      this.sesion.cerrarSesion();
      return 'invalida';
    }

    try {
      await firstValueFrom(this.httpSinInterceptores.get(`${this.apiUrl}/me`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      }).pipe(timeout(8000)));
      return this.sesion.obtenerToken() === token ? 'vigente' : 'obsoleta';
    } catch (error) {
      if (this.sesion.obtenerToken() !== token) return 'obsoleta';
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 404)) {
        this.sesion.cerrarSesion();
        return 'invalida';
      }
      return 'no-verificada';
    }
  }
}
