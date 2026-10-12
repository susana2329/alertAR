import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronDownOutline, checkmark } from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'chevron-down-outline': chevronDownOutline,
  checkmark,
});

type SeccionId = 'antes' | 'durante' | 'despues';

interface Seccion {
  id: SeccionId;
  titulo: string;
  subtitulo: string;
  icono: 'casa' | 'sirena';
  fondoIcono: string;
  colorIcono: string;
}

interface Emergencia {
  titulo: string;
  imagen?: string; // ruta de la ilustración de fondo (opcional)
  contenido: Record<SeccionId, string[]>;
}

const SIN_CONTENIDO: Record<SeccionId, string[]> = { antes: [], durante: [], despues: [] };

// Las claves coinciden con el "id" de cada categoría en la página Recomendaciones.
const EMERGENCIAS: Record<string, Emergencia> = {
  inundaciones: {
    titulo: 'Inundaciones',
    // imagen: 'img/inundaciones-fondo.png',
    contenido: {
      // OJO: "antes" y "despues" son texto borrador, validar con fuentes oficiales (Defensa Civil).
      antes: [
        'Conocé si tu zona es inundable',
        'Armá una mochila de emergencia',
        'Guardá tus documentos en bolsas impermeables',
        'Acordá un punto de encuentro con tu familia',
        'Anotá los teléfonos de emergencia',
      ],
      durante: [
        'Evita salir de tu casa',
        'No cruces calles inundadas',
        'Desconecta los aparatos eléctricos',
        'Mantenete informado por canales oficiales',
        'Tené tu mochila de emergencia a mano',
      ],
      despues: [
        'Volvé a tu casa solo cuando las autoridades lo indiquen',
        'No uses aparatos eléctricos que se hayan mojado',
        'Evitá el contacto con el agua de la inundación',
        'Tomá solo agua segura: hervila o potabilizala',
        'Sacá fotos de los daños para tus trámites',
      ],
    },
  },
  tormentas: { titulo: 'Tormentas', contenido: SIN_CONTENIDO },
  sismos: { titulo: 'Sismos', contenido: SIN_CONTENIDO },
  incendios: { titulo: 'Incendios', contenido: SIN_CONTENIDO },
  'olas-calor': { titulo: 'Olas de calor', contenido: SIN_CONTENIDO },
  'viento-fuerte': { titulo: 'Viento fuerte', contenido: SIN_CONTENIDO },
};

@Component({
  selector: 'app-detalle-recomendacion',
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule],
  templateUrl: './detalle-recomendacion.page.html',
  styleUrls: ['./detalle-recomendacion.page.scss']
})
export class DetalleRecomendacionPage {

  emergencia: Emergencia;

  secciones: Seccion[] = [
    {
      id: 'antes',
      titulo: 'Antes de la emergencia',
      subtitulo: 'Preparate con anticipación para reducir riesgos',
      icono: 'casa',
      fondoIcono: '#B9D6F3',
      colorIcono: '#03294F',
    },
    {
      id: 'durante',
      titulo: 'Durante la emergencia',
      subtitulo: 'Qué hacer mientras ocurre',
      icono: 'sirena',
      fondoIcono: '#8FBC9B',
      colorIcono: '#FFFFFF',
    },
    {
      id: 'despues',
      titulo: 'Después de la emergencia',
      subtitulo: 'Cómo actuar luego de que pase',
      icono: 'casa',
      fondoIcono: '#B9D6F3',
      colorIcono: '#03294F',
    },
  ];

  abiertas: Record<SeccionId, boolean> = { antes: false, durante: true, despues: false };

  constructor(private route: ActivatedRoute, private router: Router) {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.emergencia = EMERGENCIAS[id] ?? { titulo: 'Recomendaciones', contenido: SIN_CONTENIDO };
  }

  toggle(id: SeccionId): void {
    this.abiertas[id] = !this.abiertas[id];
  }

  volver(): void {
    this.router.navigate(['/inicio/recomendaciones']);
  }
}