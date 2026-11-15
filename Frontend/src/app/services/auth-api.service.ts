import { Injectable } from '@angular/core';
import { SesionService } from './sesion.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuthApiService {

  constructor(private sesion: SesionService) { }

  private async pedir(ruta: string, opciones: RequestInit): Promise<any> {
    let respuesta: Response;

    try {
      respuesta = await fetch(API_URL + ruta, opciones);
    } catch (error) {
      throw new Error('No pudimos conectar con el servidor');
    }

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'Ocurrió un error, probá de nuevo');
    }

    return datos;
  }

  async registrar(nombre: string, apellido: string, email: string, password: string) {
    const datos = await this.pedir('/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellido, email, password })
    });

    this.sesion.iniciar(datos.token, datos.usuario);
    return datos.usuario;
  }

  async iniciarSesion(email: string, password: string) {
    const datos = await this.pedir('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    this.sesion.iniciar(datos.token, datos.usuario);
    return datos.usuario;
  }

  async sesionVigente(): Promise<boolean> {
    const token = this.sesion.obtenerToken();


    if (!token) {
      return true;
    }

    try {
      const respuesta = await fetch(API_URL + '/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (respuesta.status === 401 || respuesta.status === 404) {
        this.sesion.cerrarSesion();
        return false;
      }
    } catch (error) {
    }

    return true;
  }
}