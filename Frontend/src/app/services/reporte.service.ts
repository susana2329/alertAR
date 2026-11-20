import { Injectable, inject } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');
const ENDPOINT_REPORTES = `${API_ORIGIN}/reportes`;
import { Observable, defer, finalize, map, tap } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { ReportCameraRecovery } from './borrador-reporte.service';
import { Report } from '../models/reporte';
import { SesionService } from './sesion.service';
@Injectable({ providedIn: 'root' })
export class ReporteService {
    private readonly sesion = inject(SesionService);

    constructor(private http: HttpClient) { }
    postreporte(form: FormData): Observable<Report> {
        const token = this.sesion.obtenerToken();
        const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
        return defer(() => {
            const inicio = Date.now();
            let status = -1;
            return this.http.post<Report>(`${ENDPOINT_REPORTES}/reporte`, form, { headers, observe: 'response' }).pipe(
                tap({ next: response => { status = response.status; }, error: error => { status = error.status ?? 0; } }),
                map(response => response.body as Report),
                finalize(() => {
                    if (Capacitor.getPlatform() === 'android') {
                        void ReportCameraRecovery.uploadResult({ status, durationMs: Date.now() - inicio }).catch(() => {});
                    }
                })
            );
        });
    }
}
