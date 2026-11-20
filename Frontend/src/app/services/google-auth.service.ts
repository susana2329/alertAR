import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { SesionService, UsuarioSesion } from './sesion.service';
import { environment } from '../../environments/environment';
import { diagnosticarError } from '../utils/diagnostico-error';
declare const google: any;
const GOOGLE_CLIENT_ID = environment.googleClientId || '1047238975139-gt4obqstc0k95l9i7lbpudj2skrtkgs8.apps.googleusercontent.com';
const API_URL = environment.apiUrl.replace(/\/$/, '');
const NativeGoogleAuth = registerPlugin<{
  signIn(options: { serverClientId: string }): Promise<{ idToken: string; nonce: string }>;
}>('NativeGoogleAuth');

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {

  constructor(private sesion: SesionService) { }

  entrar(): Promise<UsuarioSesion> {
    if (Capacitor.getPlatform() === 'android') return this.entrarNativo();
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined') {
        reject(new Error('No se pudo cargar Google. Revisá tu conexión.'));
        return;
      }

      const cliente = google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (respuesta: any) => {
          if (respuesta.error) {
            reject(new Error('No se pudo entrar con Google'));
            return;
          }

          try {
            resolve(await this.intercambiarCredencial('/auth/google', { code: respuesta.code }));
          } catch (error) {
            reject(error);
          }
        },
        error_callback: () => reject(new Error('Cerraste la ventana de Google'))
      });

      cliente.requestCode();
    });
  }

  private async entrarNativo(): Promise<UsuarioSesion> {
    const credencial = await NativeGoogleAuth.signIn({ serverClientId: GOOGLE_CLIENT_ID });
    return this.intercambiarCredencial('/auth/google/native', credencial);
  }

  private async intercambiarCredencial(ruta: string, credencial: object): Promise<UsuarioSesion> {
    const url = `${API_URL}${ruta}`;
    let llamada: Response;
    try {
      llamada = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credencial)
      });
    } catch (error) {
      console.error('[HTTP]', diagnosticarError(error, url));
      throw new Error('No pudimos conectar con el servidor');
    }

    const datos = await llamada.json().catch(() => ({}));
    if (!llamada.ok) {
      console.error('[HTTP]', diagnosticarError({
        name: 'FetchHttpError', message: datos.mensaje || llamada.statusText,
        status: llamada.status, url: llamada.url
      }));
      throw new Error(datos.mensaje || 'No se pudo entrar con Google');
    }
    if (!datos.token || !datos.usuario) throw new Error('La respuesta de Google fue incompleta');
    this.sesion.iniciar(datos.token, datos.usuario);
    return datos.usuario;
  }
}
