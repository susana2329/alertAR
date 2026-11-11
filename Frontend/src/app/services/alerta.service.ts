import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { Alerta } from '../models/alerta.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly http = inject(HttpClient);
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
}
