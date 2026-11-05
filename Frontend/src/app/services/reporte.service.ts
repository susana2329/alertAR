import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Report } from '../models/reporte';
import { HttpClient } from '@angular/common/http';
@Injectable({ providedIn: 'root' })
export class ReporteService {
    
    constructor(private http: HttpClient) { }
    postreporte(form: FormData, id: string): Observable<Report> {
        console.log(id, form)
        return this.http.post<Report>('http://localhost:3000/reportes/reporte' + `/${id}`, form)
    }
    getreporte(): Observable<Report> {
        return this.http.get<Report>('http://localhost:3000/reportes/reporte')
    }
    getreporteid(id: string): Observable<Report> {
        return this.http.get<Report>('http://localhost:3000/reportes/reporte'+ `/${id}`)
    }
}