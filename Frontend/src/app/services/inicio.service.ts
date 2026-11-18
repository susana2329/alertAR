import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Alerta } from '../models/alerta.model';
import { CoordenadasUsuario } from './sesion.service';

export interface EventoInicio extends Alerta {
  distanciaKm: number | null;
  dentroDelArea: boolean;
  calidadDatos: number;
  relevancia: number;
  fechaActualizacion: string | null;
  informacionPreventiva: string | null;
  recomendacionesDisponibles: boolean;
}

export interface RespuestaInicio {
  ubicacion: CoordenadasUsuario | null;
  actualizadoEn: string;
  estado: 'alerta' | 'informacion' | 'sin-situaciones-relevantes';
  destacada: EventoInicio | null;
  eventos: EventoInicio[];
  mensaje: string | null;
}

@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl.replace(/\/$/, '')}/inicio`;

  obtener(ubicacion?: CoordenadasUsuario): Observable<RespuestaInicio> {
    const params = ubicacion
      ? new HttpParams().set('latitud', ubicacion.latitud).set('longitud', ubicacion.longitud)
      : new HttpParams();
    return this.http.get<RespuestaInicio>(this.endpoint, { params });
  }
}
