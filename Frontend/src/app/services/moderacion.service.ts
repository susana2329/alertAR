import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionService } from './sesion.service';
import type { FotoReporteUsuario } from './reportes-usuario.service';

export interface ReportePendienteModeracion {
  _id: string;
  tipo: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  estadoVecinal?: 'sin_confirmar' | 'confirmado' | 'cerrado';
  estadoModeracion: 'pendiente' | 'aprobado' | 'rechazado';
  fotos: FotoReporteUsuario[];
  usuario?: {
    id: string;
    nombre: string;
    apellido?: string;
    email: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ModeracionService {
  private readonly baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
  private readonly sesion = inject(SesionService);
  private readonly http = inject(HttpClient);

  listarPendientes(): Observable<ReportePendienteModeracion[]> {
    const token = this.sesion.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<ReportePendienteModeracion[]>(`${this.baseUrl}/reportes/pendientes`, { headers });
  }

  moderarReporte(id: string, accion: 'aprobar' | 'rechazar', motivo?: string): Observable<{ mensaje: string; reporte: any }> {
    const token = this.sesion.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.patch<{ mensaje: string; reporte: any }>(
      `${this.baseUrl}/reportes/reporte/${encodeURIComponent(id)}/moderar`,
      { accion, motivo },
      { headers }
    );
  }
}
