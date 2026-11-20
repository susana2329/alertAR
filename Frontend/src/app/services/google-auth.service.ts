import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { SesionService } from './sesion.service';
import { environment } from '../../environments/environment';
import { diagnosticarError } from '../utils/diagnostico-error';

declare const google: any;

const GOOGLE_CLIENT_ID = environment.googleClientId ||
  '1047238975139-gt4obqstc0k95l9i7lbpudj2skrtkgs8.apps.googleusercontent.com';

const API_URL = environment.apiUrl.replace(/\/$/, '');

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {

  private inicializacionAndroid?: Promise<void>;

  constructor(private sesion: SesionService) {}




  private inicializarGoogleAndroid(): Promise<void> {

    if (!this.inicializacionAndroid) {

      this.inicializacionAndroid = SocialLogin.initialize({
        google: {
          webClientId: GOOGLE_CLIENT_ID,
          mode: 'online',
          skipAuthOnlyAuthorizationAfterSignIn: true
        }
      }).catch((error) => {

        this.inicializacionAndroid = undefined;
        throw error;

      });

    }

    return this.inicializacionAndroid;
  }




  private async intercambiarIdToken(
    idToken: string
  ): Promise<any> {

    const endpoint = `${API_URL}/auth/google/id-token`;

    try {

      const llamada = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });

      const datos = await llamada.json().catch(() => null);

      if (!llamada.ok) {

        throw new Error(
          datos?.mensaje || 'No se pudo verificar la cuenta de Google'
        );

      }

      if (!datos?.token || !datos?.usuario) {

        throw new Error(
          'El servidor no devolvió los datos de sesión esperados'
        );

      }

   
      this.sesion.iniciar(datos.token, datos.usuario);

      return datos.usuario;

    } catch (error: any) {

      console.error(
        '[GOOGLE ANDROID]',
        diagnosticarError(error, endpoint)
      );

      throw error instanceof Error
        ? error
        : new Error('No pudimos conectar con el servidor');

    }

  }


  private async entrarAndroid(): Promise<any> {


    await this.inicializarGoogleAndroid();


    const respuesta: any = await SocialLogin.login({
      provider: 'google',
      options: {}
    });

  
    const idToken = respuesta.result?.idToken;

    if (!idToken || typeof idToken !== 'string') {

      console.error(
        '[GOOGLE ANDROID] No se recibió un ID Token',
        respuesta
      );

      throw new Error(
        'Google no devolvió el token de autenticación'
      );

    }

  
    return this.intercambiarIdToken(idToken);
  }


 

  private async intercambiarCodigo(
    code: string
  ): Promise<any> {

    const endpoint = `${API_URL}/auth/google`;

    const llamada = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const datos = await llamada.json().catch(() => null);

    if (!llamada.ok) {

      throw new Error(
        datos?.mensaje || 'No se pudo iniciar sesión con Google'
      );

    }

    if (!datos?.token || !datos?.usuario) {

      throw new Error(
        'El servidor no devolvió los datos de sesión esperados'
      );

    }

    this.sesion.iniciar(datos.token, datos.usuario);

    return datos.usuario;
  }




  private entrarWeb(): Promise<any> {

    return new Promise((resolve, reject) => {

      if (typeof google === 'undefined') {

        reject(
          new Error('No se pudo cargar Google. Revisá tu conexión.')
        );

        return;
      }

      const cliente = google.accounts.oauth2.initCodeClient({

        client_id: GOOGLE_CLIENT_ID,

        scope: 'openid email profile',

        ux_mode: 'popup',

        callback: async (respuesta: any) => {

          if (respuesta.error || !respuesta.code) {

            reject(
              new Error('No se pudo entrar con Google')
            );

            return;
          }

          try {

            const usuario = await this.intercambiarCodigo(
              respuesta.code
            );

            resolve(usuario);

          } catch (error: any) {

            console.error(
              '[GOOGLE WEB]',
              diagnosticarError(
                error,
                `${API_URL}/auth/google`
              )
            );

            reject(
              error instanceof Error
                ? error
                : new Error('No pudimos conectar con el servidor')
            );

          }

        },

        error_callback: () => {

          reject(
            new Error('Cerraste la ventana de Google')
          );

        }

      });

      cliente.requestCode();

    });
  }


 

  entrar(): Promise<any> {

   
    if (Capacitor.getPlatform() === 'android') {

      return this.entrarAndroid();

    }

    return this.entrarWeb();

  }

}
