import { Alerta } from '../models/alerta.model';

const TITULOS = [
  { titulo: 'Inundación', tipo: 'inundacion' },
  { titulo: 'Tormenta fuerte', tipo: 'tormenta' },
  { titulo: 'Incidente en la vía pública', tipo: 'incidente' },
  { titulo: 'Crecida de río', tipo: 'crecida' },
  { titulo: 'Árbol caído', tipo: 'arbol' },
  { titulo: 'Temperaturas elevadas', tipo: 'temperaturas' },
  { titulo: 'Corte de tránsito', tipo: 'transito' },
  { titulo: 'Alerta meteorológica', tipo: 'meteorologica' },
];

const NIVELES = ['emergencia', 'advertencia', 'precaucion'] as const;
const FUENTES = ['SMN', 'INA'] as const;

const ZONAS = [
  { latitud: -34.5885, longitud: -58.4305 },
  { latitud: -34.5628, longitud: -58.4567 },
  { latitud: -34.6037, longitud: -58.3816 },
  { latitud: -34.6095, longitud: -58.3974 },
  { latitud: -34.6185, longitud: -58.4350 },
  { latitud: -34.6275, longitud: -58.4620 },
  { latitud: -34.6560, longitud: -58.4770 },
  { latitud: -34.6390, longitud: -58.3650 },
  { latitud: -34.5750, longitud: -58.4850 },
  { latitud: -34.6100, longitud: -58.4550 },
  { latitud: -34.5900, longitud: -58.3900 },
  { latitud: -34.6740, longitud: -58.4500 },
];

let semilla = 20261012;

function aleatorio(): number {
  semilla = (semilla * 16807) % 2147483647;
  return (semilla - 1) / 2147483646;
}

function desplazamientoNormal(): number {
  let suma = 0;

  for (let i = 0; i < 6; i++) {
    suma += aleatorio();
  }

  return (suma - 3) * 0.0025;
}

export const ALERTAS_MOCK: Alerta[] = Array.from(
  { length: 100 },
  (_, i) => {
    const base = TITULOS[i % TITULOS.length];
    const origen = i % 3 === 0 ? 'oficial' : 'vecinal';

    let latitud: number;
    let longitud: number;

    if (aleatorio() < 0.75) {
      const zona = ZONAS[Math.floor(aleatorio() * ZONAS.length)];

      latitud = zona.latitud + desplazamientoNormal();
      longitud = zona.longitud + desplazamientoNormal();
    } else {
      latitud = -34.555 + aleatorio() * 0.135;
      longitud = -58.530 + aleatorio() * 0.180;
    }

    return {
      id: String(i + 1),
      titulo: `${base.titulo} #${i + 1}`,
      tipo: base.tipo,
      nivel: NIVELES[i % NIVELES.length],
      origen,
      ...(origen === 'oficial'
        ? { fuente: FUENTES[i % FUENTES.length] }
        : {}),
      descripcion:
        i % 4 === 0
          ? 'Se reporta una situación que podría afectar significativamente la circulación y la seguridad de los vecinos de la zona.'
          : `Alerta de prueba ${i + 1}. Se necesita verificar la situación y evaluar su impacto en el área afectada.`,
      fechaInicio: new Date(
        Date.UTC(2026, 8, 19, 18, 0) + i * 5 * 60 * 1000
      ).toISOString(),
      ubicacion: {
        latitud,
        longitud,
      },
    } as Alerta;
  }
);