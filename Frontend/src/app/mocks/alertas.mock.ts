import { Alerta } from '../models/alerta.model';

export const ALERTAS_MOCK: Alerta[] = [

  {
    id: '1',
    titulo: 'Inundación',
    tipo: 'inundacion',
    nivel: 'emergencia',
    origen: 'oficial',
    fuente: 'INA',
    descripcion: 'Zona afectada por acumulación de agua.',
    fechaInicio: '2026-09-19T18:00:00',
    ubicacion: {
      latitud: -34.6792,
      longitud: -58.4627
    }
  },

  {
    id: '2',
    titulo: 'Tormenta fuerte',
    tipo: 'tormenta',
    nivel: 'advertencia',
    origen: 'oficial',
    fuente: 'SMN',
    descripcion: 'Se esperan lluvias intensas y actividad eléctrica en la zona.',
    fechaInicio: '2026-09-19T19:00:00',
    ubicacion: {
      latitud: -34.6705,
      longitud: -58.4550
    }
  },

  {
    id: '3',
    titulo: 'Incidente en la vía pública',
    tipo: 'incidente',
    nivel: 'precaucion',
    origen: 'vecinal',
    descripcion: 'Un vecino reportó un incidente en esta ubicación.',
    fechaInicio: '2026-09-19T20:00:00',
    ubicacion: {
      latitud: -34.6860,
      longitud: -58.4700
    }
  },

  {
    id: '4',
    titulo: 'Crecida de río',
    tipo: 'crecida',
    nivel: 'emergencia',
    origen: 'oficial',
    fuente: 'INA',
    descripcion: 'Se registró un aumento significativo del nivel del agua.',
    fechaInicio: '2026-09-19T20:30:00',
    ubicacion: {
      latitud: -34.6650,
      longitud: -58.4750
    }
  },

  {
    id: '5',
    titulo: 'Árbol caído',
    tipo: 'arbol',
    nivel: 'precaucion',
    origen: 'vecinal',
    descripcion: 'Se reportó la caída de un árbol que afecta parcialmente la circulación.',
    fechaInicio: '2026-09-19T21:00:00',
    ubicacion: {
      latitud: -34.6920,
      longitud: -58.4580
    }
  },

  {
    id: '6',
    titulo: 'Temperaturas elevadas',
    tipo: 'temperaturas',
    nivel: 'advertencia',
    origen: 'oficial',
    fuente: 'SMN',
    descripcion: 'Se esperan temperaturas elevadas durante las próximas horas.',
    fechaInicio: '2026-09-19T21:30:00',
    ubicacion: {
      latitud: -34.6740,
      longitud: -58.4680
    }
  },

  {
    id: '7',
    titulo: 'Corte de tránsito',
    tipo: 'transito',
    nivel: 'advertencia',
    origen: 'vecinal',
    descripcion: 'Vecinos reportaron un corte de tránsito en la zona.',
    fechaInicio: '2026-09-19T22:00:00',
    ubicacion: {
      latitud: -34.6820,
      longitud: -58.4500
    }
  },

  {
    id: '8',
    titulo: 'Alerta meteorológica',
    tipo: 'meteorologica',
    nivel: 'emergencia',
    origen: 'oficial',
    fuente: 'SMN',
    descripcion: 'Condiciones meteorológicas adversas previstas para la zona.',
    fechaInicio: '2026-09-19T22:30:00',
    ubicacion: {
      latitud: -34.6900,
      longitud: -58.4750
    }
  }

];