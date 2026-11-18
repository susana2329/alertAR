import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionService } from './sesion.service';

export interface FotoReporteUsuario {
  originalname?: string;
  mimetype?: string;
  size?: number;
  url: string;
}

export interface ReporteUsuario {
  _id: string;
  tipo: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  estado: string;
  estadoVecinal?: 'sin_confirmar' | 'confirmado' | 'cerrado';
  estadoModeracion?: 'pendiente' | 'aprobado' | 'rechazado';
  motivoModeracion?: string;
  fotos: FotoReporteUsuario[];
}

@Injectable({ providedIn: 'root' })
export class ReportesUsuarioService {
  private readonly baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
  private readonly sesion = inject(SesionService);

  constructor(private http: HttpClient) {}

  listarPorUsuario(): Observable<ReporteUsuario[]> {
    const token = this.sesion.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<ReporteUsuario[]>(`${this.baseUrl}/reportes/mis-reportes`, { headers });
  }

  eliminarReporte(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.baseUrl}/reportes/reporte/${id}`);
  }
}
