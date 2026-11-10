import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioPerfil } from '../models/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class PersonalService {
  private API_URL = 'http://localhost:3000/api/cuenta/perfil';

  constructor(private _httpClient: HttpClient) {}

  obtenerDatosUsuario(id: string): Observable<UsuarioPerfil> {
    return this._httpClient.get<UsuarioPerfil>(`${this.API_URL}/${id}`);
  }

  actualizarFotoPerfil(id: string, data: { fotoPerfil: string }): Observable<any> {
  return this._httpClient.patch(`http://localhost:3000/api/cuenta/perfil/${id}/avatar`, data);
}
}