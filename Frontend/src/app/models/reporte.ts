export interface Report {
    tipo: string,
    descripcion: string,
    ubicacion: string,
    fecha: Date,
    imagen: Blob[],
    fotos: fotos[]
    estado: 'En revicion' | 'Revisado'
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