import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesUsuarioService {
  private readonly API_URL = `${environment.apiUrl.replace(/\/$/, '')}/cuenta/reportes`;

  constructor(private http: HttpClient) {}

  listarPorUsuario(idUsuario: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/usuario/${idUsuario}`);
  }
}
