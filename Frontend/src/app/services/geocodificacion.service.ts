import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { CoordenadasUsuario } from './sesion.service';

export interface UbicacionLegible {
  nombre: string | null;
  localidad: string | null;
  provincia: string | null;
  proveedor: 'OpenStreetMap';
  atribucion: string;
}

interface RespuestaGeocodificacion extends UbicacionLegible {}
interface CacheEntrada { guardadoEn: number; valor: UbicacionLegible; }

const TTL_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const CLAVE_CACHE = 'alertar_geocodificacion_v1:';

function coordenadaCache(valor: number): number { return Math.round(valor * 1000) / 1000; }

@Injectable({ providedIn: 'root' })
export class GeocodificacionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl.replace(/\/$/, '')}/geocodificacion/reversa`;

  resolver(coordenadas: CoordenadasUsuario): Observable<UbicacionLegible | null> {
    const latitud = coordenadaCache(coordenadas.latitud);
    const longitud = coordenadaCache(coordenadas.longitud);
    const clave = `${CLAVE_CACHE}${latitud},${longitud}`;
    const cache = this.leerCache(clave);
    if (cache) return of(cache);

    const params = new HttpParams().set('latitud', latitud).set('longitud', longitud);
    return this.http.get<RespuestaGeocodificacion>(this.endpoint, { params }).pipe(
      timeout({ first: 5000 }),
      map(respuesta => respuesta && respuesta.proveedor === 'OpenStreetMap' ? respuesta : null),
      tap(respuesta => { if (respuesta) this.guardarCache(clave, respuesta); }),
      catchError(() => of(null))
    );
  }

  private leerCache(clave: string): UbicacionLegible | null {
    try {
      const raw = localStorage.getItem(clave);
      if (!raw) return null;
      const entrada = JSON.parse(raw) as CacheEntrada;
      if (Date.now() - entrada.guardadoEn > TTL_CACHE_MS) {
        localStorage.removeItem(clave);
        return null;
      }
      return entrada.valor?.proveedor === 'OpenStreetMap' ? entrada.valor : null;
    } catch { return null; }
  }

  private guardarCache(clave: string, valor: UbicacionLegible): void {
    try {
      localStorage.setItem(clave, JSON.stringify({ guardadoEn: Date.now(), valor } satisfies CacheEntrada));
      const entradas: Array<{ clave: string; fecha: number }> = [];
      for (let indice = 0; indice < localStorage.length; indice++) {
        const key = localStorage.key(indice);
        if (!key?.startsWith(CLAVE_CACHE)) continue;
        try { entradas.push({ clave: key, fecha: (JSON.parse(localStorage.getItem(key) || '{}') as CacheEntrada).guardadoEn || 0 }); }
        catch { entradas.push({ clave: key, fecha: 0 }); }
      }
      entradas.sort((a, b) => b.fecha - a.fecha);
      for (const entrada of entradas.slice(100)) localStorage.removeItem(entrada.clave);
    }
    catch { /* El almacenamiento local es opcional; una falla no afecta Inicio. */ }
  }
}
