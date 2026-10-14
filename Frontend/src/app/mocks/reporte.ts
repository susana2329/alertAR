import { Report } from '../models/reporte';

export const mockReporte: Report = {
  tipo: 'Inundación',
  descripcion: 'Calle con mucha agua, difícil transitar.',
  ubicacion: 'Av. Corrientes 1234, Buenos Aires',
  fecha: new Date('2026-10-11T15:30:00'),
  imagen: []
};