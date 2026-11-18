import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, of, tap, throwError } from 'rxjs';
import { Alerta } from '../models/alerta.model';
import { environment } from '../../environments/environment';
import { SesionService } from './sesion.service';
import { FOTOS_REPORTE_VECINAL_MOCK, REPORTES_VECINALES_MOCK } from '../mocks/reportes-vecinales.mock';

export interface RespuestaVotoVecinal {
  id: string;
  estadoVecinal: 'sin_confirmar' | 'confirmado' | 'cerrado';
  votosSigue: number;
  votosNoEsta: number;
}

export interface FotoReporteVecinal {
  fieldname?: string;
  originalname?: string;
  mimetype?: string;
  size?: number;
  url: string;
}

const ENDPOINT_REPORTES = `${environment.apiUrl.replace(/\/api\/?$/, '')}/reportes/reporte`;

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly endpoint = `${environment.apiUrl.replace(/\/$/, '')}/alertas`;
  private alertasCache?: Alerta[];

  listar(): Observable<Alerta[]> {
    return this.http.get<Alerta[]>(this.endpoint).pipe(
      tap((alertas) => {
        this.alertasCache = alertas;
      })
    );
  }

  listarParaMapa(): Observable<Alerta[]> {
    if (environment.mockReportesVecinales) return of(REPORTES_VECINALES_MOCK);
    return this.http.get<unknown>(`${this.endpoint}/mapa`).pipe(
      map((respuesta): Alerta[] => {
        if (!Array.isArray(respuesta)) {
          throw new TypeError('La respuesta de alertas/mapa debe ser un arreglo.');
        }
        return respuesta as Alerta[];
      })
    );
  }

  obtenerPorId(id: string): Observable<Alerta | undefined> {
    if (this.alertasCache) {
      return of(this.alertasCache.find((alerta) => alerta.id === id));
    }
    return this.http.get<Alerta>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      map(alerta => alerta.id === id ? alerta : undefined)
    );
  }

  votarReporteVecinal(id: string, respuesta: 'sigue' | 'no_esta'): Observable<RespuestaVotoVecinal> {
    const token = this.sesion.obtenerToken();
    if (!token) return throwError(() => new Error('Iniciá sesión para responder un reporte vecinal.'));
    return this.http.post<RespuestaVotoVecinal>(
      `${ENDPOINT_REPORTES}/${encodeURIComponent(id)}/voto`,
      { respuesta },
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
    );
  }

  obtenerFotosReporteVecinal(id: string): Observable<FotoReporteVecinal[]> {
    if (environment.mockReportesVecinales) return of(FOTOS_REPORTE_VECINAL_MOCK[id] ?? []);
    return this.http.get<FotoReporteVecinal[]>(
      `${ENDPOINT_REPORTES}/${encodeURIComponent(id)}/imagenes`
    );
  }
}
