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

  obtenerPorId(id: string): Observable<Alerta | undefined> {
    if (this.alertasCache) {
      return of(this.alertasCache.find((alerta) => alerta.id === id));
    }

    return this.listar().pipe(
      map((alertas) => alertas.find((alerta) => alerta.id === id))
    );
  }
}
