import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ProgresoMochila } from '../models/mochila.model';
import { SesionService } from './sesion.service';

@Injectable({
  providedIn: 'root'
})
export class MochilaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private sesion: SesionService) { }

  private idUsuario(): string | null {
    const sesion: any = this.sesion.usuario();
    return sesion?._id || sesion?.id || null;
  }

  guardarProgreso(tipoMochila: string, itemsCompletados: number[]): Observable<ProgresoMochila> {
    const userId = this.idUsuario();
    if (!userId) {
      return throwError(() => new Error('No hay un usuario con sesión iniciada'));
    }
    const body = { tipoMochila, itemsCompletados };
    return this.http.put<ProgresoMochila>(`${this.apiUrl}/mochila/${userId}`, body);
  }

  obtenerMochilas(): Observable<any> {
    const userId = this.idUsuario();
    if (!userId) {
      return throwError(() => new Error('No hay un usuario con sesión iniciada'));
    }
    const token = localStorage.getItem('alertar_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.apiUrl}/mochila/${userId}`, { headers });
  }

  obtenerProgreso(clave: string): Observable<number[]> {
    return this.obtenerMochilas().pipe(
      map((data: any) => {
        const doc = Array.isArray(data) ? data[0] : data;
        const valor = doc?.[clave];

        const lista: any[] = Array.isArray(valor)
          ? valor
          : (valor && typeof valor === 'object' ? (Object.values(valor) as any[]).flat() : []);

        return lista.map(Number).filter(n => Number.isFinite(n));
      })
    );
  }
}