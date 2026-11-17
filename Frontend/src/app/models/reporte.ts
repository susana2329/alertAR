import type { CoordenadasUsuario } from '../services/sesion.service';

export interface Report {
    tipo: string,
    descripcion: string,
    ubicacion: string,
    fecha: Date,
    imagen: Blob[],
    fotos: fotos[]
    estado: 'En revicion' | 'Revisado'
    coordenadas?: CoordenadasUsuario | null
}
export interface fotos {
    fieldname: string, 
    originalname: string,
    encoding: string,
    mimetype: string, 
    buffer: string, 
    size: number, 
    key: string
}