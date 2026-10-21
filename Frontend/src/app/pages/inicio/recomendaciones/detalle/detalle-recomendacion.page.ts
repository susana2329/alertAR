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

const EMERGENCIAS: Record<string, Emergencia> = {
  inundaciones: {
    titulo: 'Inundaciones',
    imagen: 'assets/image/inundaciones-fondo.png',
    contenido: {
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
  tormentas: {
      titulo: 'Tormentas',
      imagen: 'assets/image/tormenta-fondo.jpg',
        contenido: {
          antes: [
          'Asegurá objetos sueltos en balcones y patios',
          'Revisá techos, canaletas y desagües',
          'Cargá tu celular y tené una linterna a mano',
          'Armá una mochila de emergencia',
        'Seguí los avisos del Servicio Meteorológico Nacional',
      ],
      durante: [
        'Quedate en un lugar cerrado y seguro',
        'Alejate de ventanas y de árboles',
        'Desconectá los aparatos eléctricos',
        'No uses vehículos ni cruces calles anegadas',
        'Mantenete informado por canales oficiales',
      ],
      despues: [
        'Esperá a que pase la tormenta antes de salir',
        'Alejate de cables caídos y avisá a la empresa de energía',
        'Revisá si hay daños en tu casa antes de usar la luz',
        'Evitá ramas y árboles debilitados',
        'Ayudá a tus vecinos si lo necesitan',
      ],
    },
  },
  sismos: {
    titulo: 'Sismos',
    imagen: 'assets/image/sismos-fondo.jpg',
    contenido: {
      antes: [
        'Identificá lugares seguros en cada ambiente',
        'Fijá a la pared los muebles altos y objetos pesados',
        'Armá una mochila de emergencia',
        'Conocé las salidas y el punto de encuentro familiar',
        'Aprendé dónde cortar el gas, la luz y el agua',
      ],
      durante: [
        'Mantené la calma',
        'Agachate, cubrite y sostenete',
        'Alejate de ventanas, espejos y objetos que puedan caer',
        'No uses ascensores',
        'Si estás afuera, alejate de edificios y cables',
      ],
      despues: [
        'Revisá si hay heridos y prestá primeros auxilios',
        'Cortá el gas, la luz y el agua si hay daños',
        'Salí con cuidado y usá las escaleras',
        'Preparate para posibles réplicas',
        'Usá el teléfono solo para emergencias',
      ],
    },
  },
  incendios: {
    titulo: 'Incendios',
    imagen: 'assets/image/incendios-fondo.jpg',
    contenido: {
      antes: [
        'Revisá las instalaciones eléctricas y de gas',
        'Tené un matafuegos y aprendé a usarlo',
        'Planificá y practicá una ruta de escape',
        'No acumules materiales inflamables',
        'Anotá el teléfono de Bomberos (100)',
      ],
      durante: [
        'Llamá a Bomberos al 100 y avisá a los demás',
        'Salí de inmediato y no vuelvas por tus cosas',
        'Si hay humo, avanzá agachado cerca del piso',
        'Cerrá las puertas detrás de vos',
        'No uses ascensores',
      ],
      despues: [
        'No vuelvas a entrar hasta que Bomberos lo autorice',
        'Revisá si hay heridos y pedí asistencia médica',
        'Evitá acercarte a estructuras dañadas',
        'Ventilá bien antes de usar artefactos',
        'Sacá fotos de los daños para tus trámites',
      ],
    },
  },
  'olas-calor': {
    titulo: 'Olas de calor',
    imagen: 'assets/image/oladecalor-fondo.jpg',
    contenido: {
      antes: [
        'Revisá que tu ventilador o aire acondicionado funcione',
        'Tené agua potable y alimentos frescos',
        'Protegé las ventanas del sol con cortinas o persianas',
        'Seguí los avisos del Servicio Meteorológico Nacional',
        'Ubicá lugares frescos cerca de tu casa',
      ],
      durante: [
        'Tomá agua seguido, aunque no tengas sed',
        'Evitá el sol entre las 11 y las 17 h',
        'Usá ropa clara y liviana',
        'Evitá comidas pesadas y bebidas alcohólicas o azucaradas',
        'Nunca dejes personas ni mascotas en autos cerrados',
        'Prestá atención a niños y adultos mayores',
      ],
      despues: [
        'Seguí hidratándote',
        'Descansá en lugares frescos',
        'Consultá a un médico si tenés mareos o dolor de cabeza intenso',
        'Fijate cómo están tus vecinos mayores',
        'Retomá tus actividades de a poco',
      ],
    },
  },
  'viento-fuerte': {
    titulo: 'Viento fuerte',
    imagen: 'assets/image/vientofuerte-fondo.jpg',
    contenido: {
      antes: [
        'Asegurá o guardá los objetos sueltos',
        'Revisá techos, chapas y antenas',
        'Podá las ramas secas o en riesgo',
        'Cargá tu celular y tené una linterna a mano',
        'Seguí los avisos del Servicio Meteorológico Nacional',
      ],
      durante: [
        'Quedate en un lugar cerrado',
        'Alejate de ventanas y vidrios',
        'No te refugies bajo árboles, carteles ni cables',
        'Evitá circular, sobre todo en moto o bicicleta',
        'Si manejás, frená lejos de árboles y postes',
      ],
      despues: [
        'Alejate de cables caídos y avisá a la empresa de energía',
        'Revisá los daños antes de usar el gas o la luz',
        'Evitá árboles, chapas y estructuras inestables',
        'Despejá con cuidado ramas y escombros',
        'Sacá fotos de los daños para tus trámites',
      ],
    },
  },
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

  get fondo(): string {
  return this.emergencia.imagen
    ? `url(${this.emergencia.imagen}) center / cover no-repeat #2B93AE`
    : 'linear-gradient(to bottom, #3B4046 0, #747C83 150px, #2B93AE 210px) top center / 100% auto no-repeat #2B93AE';
  }

  toggle(id: SeccionId): void {
    this.abiertas[id] = !this.abiertas[id];
  }

  volver(): void {
    this.router.navigate(['/inicio/recomendaciones']);
  }
}