import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesUsuarioService {
  private readonly baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  constructor(private http: HttpClient) {}

  listarPorUsuario(idUsuario: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reportes/reporte/${idUsuario}`);
  }
}
