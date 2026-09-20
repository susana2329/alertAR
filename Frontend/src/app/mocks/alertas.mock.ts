import { Alerta } from '../models/alerta.model';

export const ALERTAS_MOCK: Alerta[] = [
  {
    id: '1',
    titulo: 'Inundación',
    nivel: 'emergencia',
    fuente: 'oficial',
    descripcion: 'Zona afectada por acumulación de agua.',
    fechaInicio: '2026-09-19T18:00:00',
    ubicacion: {
      latitud: -34.6792,
      longitud: -58.4627
    }
  },
  {
    id: '2',
    titulo: 'Corte de tránsito',
    nivel: 'advertencia',
    fuente: 'oficial',
    descripcion: 'Corte preventivo de tránsito en la zona.',
    fechaInicio: '2026-09-19T19:00:00',
    ubicacion: {
      latitud: -34.6705,
      longitud: -58.4550
    }
  },
  {
    id: '3',
    titulo: 'Incidente en la vía pública',
    nivel: 'precaucion',
    fuente: 'vecino',
    descripcion: 'Un vecino reportó un incidente en esta ubicación.',
    fechaInicio: '2026-09-19T20:00:00',
    ubicacion: {
      latitud: -34.6860,
      longitud: -58.4700
    }
  }
];