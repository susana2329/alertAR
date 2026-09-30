export interface Alerta {

  id: string;

  titulo: string;

  nivel: 'precaucion' | 'advertencia' | 'emergencia';

  origen: 'vecinal' | 'oficial';

  fuente?: string;

  descripcion: string;

  fechaInicio: string;

  fechaFin?: string;

  ubicacion: {

    latitud: number;

    longitud: number;

  };

}