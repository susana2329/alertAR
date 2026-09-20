export interface Alerta {
  id: string;
  titulo: string;
  nivel: 'precaucion' | 'advertencia' | 'emergencia';

  fuente: 'oficial' | 'vecino';

  descripcion: string;

  fechaInicio: string;
  fechaFin?: string;

  ubicacion: {
    latitud: number;
    longitud: number;
  };
}