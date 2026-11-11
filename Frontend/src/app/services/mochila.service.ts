import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; 
import { ProgresoMochila } from '../models/mochila.model';

@Injectable({
  providedIn: 'root'
})
export class MochilaService {
  
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) { }

  guardarProgreso(tipoMochila: string, itemsCompletados: number[]) {
    const body = { tipoMochila, itemsCompletados };
    return this.http.put<ProgresoMochila>(`${this.apiUrl}/mochila`, body);
  }
}