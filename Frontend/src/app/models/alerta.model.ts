export type TipoAlerta =
  | 'inundacion'
  | 'tormenta'
  | 'crecida'
  | 'temperaturas'
  | 'incidente'
  | 'arbol'
  | 'transito'
  | 'meteorologica'
  | 'nevada'
  | 'sismo'
  | 'observacion';

export type NivelAlerta =
  | 'precaucion'
  | 'advertencia'
  | 'emergencia'
  | 'informativo'
  | 'desconocido';

export type OrigenAlerta = 'vecinal' | 'oficial';

export interface UbicacionAlerta {
  latitud: number;
  longitud: number;
}

export interface GeometriaPunto {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeometriaPoligono {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeometriaMultiPoligono {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export interface DetalleFuente {
  [clave: string]: unknown;
}

export type NaturalezaAlerta = 'alerta' | 'observacion' | 'contexto';

export interface Alerta {
  id: string;
  titulo: string;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  origen: OrigenAlerta;
  descripcion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  ubicacion: UbicacionAlerta | null;
  geometria: GeometriaPunto | GeometriaPoligono | GeometriaMultiPoligono | null;
  fuente?: string;
  naturaleza?: NaturalezaAlerta;
  etiqueta?: string;
  color?: 'rojo' | 'naranja' | 'amarillo' | 'azul' | 'turquesa' | 'neutro' | string;
  descripcionPreview?: string;
  descripcionCompleta?: string;
  detalle?: DetalleFuente;
}

export type ColorPresentacionAlerta = 'rojo' | 'naranja' | 'amarillo' | 'azul' | 'neutro';

const COLOR_POR_NIVEL: Record<NivelAlerta, ColorPresentacionAlerta> = {
  emergencia: 'rojo', advertencia: 'naranja', precaucion: 'amarillo', informativo: 'azul', desconocido: 'neutro'
};

export function colorPresentacionAlerta(
  nivel: NivelAlerta | string,
  colorFuente?: string | null,
  naturaleza?: NaturalezaAlerta
): ColorPresentacionAlerta {
  if (nivel === 'desconocido') return 'neutro';
  if (colorFuente === 'rojo' || colorFuente === 'naranja' || colorFuente === 'amarillo' || colorFuente === 'azul') return colorFuente;
  if (colorFuente === 'turquesa') return 'azul'; // Compatibilidad con respuestas previas de la API.
  if (colorFuente === 'neutro') return 'neutro';
  if (naturaleza === 'contexto') return 'azul';
  return COLOR_POR_NIVEL[nivel as NivelAlerta] ?? 'neutro';
}

export function etiquetaNivelAlerta(nivel: NivelAlerta | string): string {
  const etiquetas: Record<NivelAlerta, string> = {
    emergencia: 'EMERGENCIA', advertencia: 'ALERTA', precaucion: 'PRECAUCIÓN',
    informativo: 'INFORMATIVO', desconocido: 'DESCONOCIDO'
  };
  return etiquetas[nivel as NivelAlerta] ?? 'DESCONOCIDO';
}
