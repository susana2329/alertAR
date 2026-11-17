import { Alerta } from '../models/alerta.model';
import type { FotoReporteVecinal } from '../services/alerta.service';

const haceMinutos = (minutos: number): string =>
  new Date(Date.now() - minutos * 60_000).toISOString();

export const REPORTES_VECINALES_MOCK: Alerta[] = [
  {
    id: 'vecinal-demo-1',
    reporteId: 'demo-1',
    titulo: 'Reporte vecinal de inundación',
    tipo: 'inundacion',
    nivel: 'informativo',
    naturaleza: 'observacion',
    origen: 'vecinal',
    fuente: 'Vecinos',
    descripcion: 'Agua acumulada sobre la calzada; se recomienda circular con precaución.',
    fechaInicio: haceMinutos(12),
    fechaFin: null,
    ubicacion: { latitud: -34.6802, longitud: -58.4614 },
    geometria: { type: 'Point', coordinates: [-58.4614, -34.6802] },
    estadoVecinal: 'sin_confirmar',
    votosSigue: 1,
    votosNoEsta: 0,
    cantidadFotos: 2
  },
  {
    id: 'vecinal-demo-2',
    reporteId: 'demo-2',
    titulo: 'Reporte vecinal de caída de árbol',
    tipo: 'arbol',
    nivel: 'informativo',
    naturaleza: 'observacion',
    origen: 'vecinal',
    fuente: 'Vecinos',
    descripcion: 'Un árbol caído ocupa parte de la calle y dificulta el paso.',
    fechaInicio: haceMinutos(28),
    fechaFin: null,
    ubicacion: { latitud: -34.6728, longitud: -58.4744 },
    geometria: { type: 'Point', coordinates: [-58.4744, -34.6728] },
    estadoVecinal: 'confirmado',
    votosSigue: 3,
    votosNoEsta: 1,
    cantidadFotos: 1
  },
  {
    id: 'vecinal-demo-3',
    reporteId: 'demo-3',
    titulo: 'Reporte vecinal de calle bloqueada',
    tipo: 'transito',
    nivel: 'informativo',
    naturaleza: 'observacion',
    origen: 'vecinal',
    fuente: 'Vecinos',
    descripcion: 'Hay un corte parcial en la calle. El tránsito circula con demora.',
    fechaInicio: haceMinutos(43),
    fechaFin: null,
    ubicacion: { latitud: -34.6861, longitud: -58.4512 },
    geometria: { type: 'Point', coordinates: [-58.4512, -34.6861] },
    estadoVecinal: 'sin_confirmar',
    votosSigue: 2,
    votosNoEsta: 1,
    cantidadFotos: 1
  },
  {
    id: 'vecinal-demo-4',
    reporteId: 'demo-4',
    titulo: 'Reporte vecinal de tormenta',
    tipo: 'tormenta',
    nivel: 'informativo',
    naturaleza: 'observacion',
    origen: 'vecinal',
    fuente: 'Vecinos',
    descripcion: 'Se observa una fuerte acumulación de agua luego de la lluvia.',
    fechaInicio: haceMinutos(65),
    fechaFin: null,
    ubicacion: { latitud: -34.6634, longitud: -58.4658 },
    geometria: { type: 'Point', coordinates: [-58.4658, -34.6634] },
    estadoVecinal: 'sin_confirmar',
    votosSigue: 0,
    votosNoEsta: 0,
    cantidadFotos: 1
  }
];

export const FOTOS_REPORTE_VECINAL_MOCK: Record<string, FotoReporteVecinal[]> = {
  'demo-1': [
    { url: '/assets/mock-reportes/calle-inundada.svg', originalname: 'Agua acumulada · imagen de muestra' },
    { url: '/assets/mock-reportes/calle-inundada.svg', originalname: 'Vista del lugar · imagen de muestra' }
  ],
  'demo-2': [
    { url: '/assets/mock-reportes/arbol-caido.svg', originalname: 'Árbol sobre la calzada · imagen de muestra' }
  ],
  'demo-3': [
    { url: '/assets/mock-reportes/calle-inundada.svg', originalname: 'Corte parcial · imagen de muestra' }
  ],
  'demo-4': [
    { url: '/assets/mock-reportes/calle-inundada.svg', originalname: 'Acumulación de agua · imagen de muestra' }
  ]
};
