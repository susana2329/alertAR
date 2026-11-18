import { Injectable, inject } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');
const ENDPOINT_REPORTES = `${API_ORIGIN}/reportes`;
import { Observable } from 'rxjs';
import { Report } from '../models/reporte';
import { SesionService } from './sesion.service';
@Injectable({ providedIn: 'root' })
export class ReporteService {
    private readonly sesion = inject(SesionService);

    constructor(private http: HttpClient) { }
    postreporte(form: FormData): Observable<Report> {
        const token = this.sesion.obtenerToken();
        const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
        return this.http.post<Report>(`${ENDPOINT_REPORTES}/reporte`, form, { headers })
    }
}
