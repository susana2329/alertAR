export interface UsuarioPerfil {
    _id: string;
    nombre: string;
    apellido: string;
    email: string;
    foto: string;
    proveedor?: 'local' | 'google';
}