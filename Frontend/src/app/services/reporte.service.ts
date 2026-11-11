import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');
const ENDPOINT_REPORTES = `${API_ORIGIN}/reportes/reporte`;
import { Observable } from 'rxjs';
import { Report } from '../models/reporte';
import { HttpClient } from '@angular/common/http';
@Injectable({ providedIn: 'root' })
export class ReporteService {
    
    constructor(private http: HttpClient) { }
    postreporte(form: FormData, id: string): Observable<Report> {
        console.log(id, form)
        return this.http.post<Report>(`${ENDPOINT_REPORTES}/${id}`, form)
    }
    getreporte(): Observable<Report> {
        return this.http.get<Report>(ENDPOINT_REPORTES)
    }
    getreporteid(id: string): Observable<Report> {
        return this.http.get<Report>(`${ENDPOINT_REPORTES}/${id}`)
    }
}
