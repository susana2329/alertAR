import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportesUsuarioService {
  private API_URL = 'http://localhost:3000/reportes';

  constructor(private http: HttpClient) {}

  listarPorUsuario(idUsuario: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/reporte/${idUsuario}`);
  }
}