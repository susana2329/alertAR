import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioPerfil } from '../models/usuario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PersonalService {
  private readonly API_URL = `${environment.apiUrl.replace(/\/$/, '')}/cuenta/perfil`;

  constructor(private _httpClient: HttpClient) {}

  obtenerDatosUsuario(id: string): Observable<UsuarioPerfil> {
    return this._httpClient.get<UsuarioPerfil>(`${this.API_URL}/${id}`);
  }
}
