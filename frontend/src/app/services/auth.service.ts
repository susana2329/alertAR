// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { USUARIOS_MOCK } from '../mocks/usuarios.mock';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarios: Usuario[] = USUARIOS_MOCK;
  private usuarioActual: Usuario | null = null;

  login(email: string, password: string): boolean {
    const usuario = this.usuarios.find(u => u.email === email && u.password === password);
    if (usuario) {
      this.usuarioActual = usuario;
      return true;
    }
    return false;
  }

  registrar(usuario: Usuario): boolean {
    const existe = this.usuarios.some(u => u.email === usuario.email);
    if (existe) return false;
    this.usuarios.push(usuario);
    this.usuarioActual = usuario;
    return true;
  }

  getUsuarioActual(): Usuario | null {
    return this.usuarioActual;
  }
}