export interface Alerta {

  id: string;

  titulo: string;
  tipo:
  | 'inundacion'
  | 'tormenta'
  | 'crecida'
  | 'temperaturas'
  | 'incidente'
  | 'arbol'
  | 'transito'
  | 'meteorologica';

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