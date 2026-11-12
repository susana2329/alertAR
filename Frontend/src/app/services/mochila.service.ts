import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProgresoMochila } from '../models/mochila.model';
import { SesionService } from './sesion.service';

@Injectable({
  providedIn: 'root'
})
export class MochilaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private sesion: SesionService) { }

  guardarProgreso(tipoMochila: string, itemsCompletados: number[]): Observable<ProgresoMochila> {
    const sesion: any = this.sesion.usuario();
    const userId = sesion?._id || sesion?.id;

    if (!userId) {
      return throwError(() => new Error('No hay un usuario con sesión iniciada'));
    }

    const body = { tipoMochila, itemsCompletados };

    return this.http.put<ProgresoMochila>(`${this.apiUrl}/mochila/${userId}`, body);
  }
}