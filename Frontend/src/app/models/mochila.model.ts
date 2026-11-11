export interface ItemMochila {
  id: number;
  titulo: string;
  subtitulo: string;
  completado: boolean;
}

export interface ProgresoMochila {
  usuarioId?: string;
  individual: number[];
  familiar: number[];
  mascotas: number[];
  hogar: number[];
}