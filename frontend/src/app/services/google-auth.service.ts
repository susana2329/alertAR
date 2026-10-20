import { Injectable } from '@angular/core';
import { SesionService } from './sesion.service';
declare const google: any;
const GOOGLE_CLIENT_ID = '1047238975139-gt4obqstc0k95l9i7lbpudj2skrtkgs8.apps.googleusercontent.com';
const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {

  constructor(private sesion: SesionService) { }

  entrar(): Promise<any> {
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
            const llamada = await fetch(API_URL + '/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: respuesta.code })
            });
            const datos = await llamada.json();

            if (!llamada.ok) {
              reject(new Error(datos.mensaje || 'No se pudo entrar con Google'));
              return;
            }

            this.sesion.iniciar(datos.token, datos.usuario);
            resolve(datos.usuario);
          } catch (error) {
            reject(new Error('No pudimos conectar con el servidor'));
          }
        },
        error_callback: () => reject(new Error('Cerraste la ventana de Google'))
      });

      cliente.requestCode();
    });
  }
}