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

interface RecomendacionItem {
  titulo: string;
  detalle: string;
}

interface Emergencia {
  titulo: string;
  imagen?: string;
  fuente?: string;
  contenido: Record<SeccionId, RecomendacionItem[]>;
}

const SIN_CONTENIDO: Record<SeccionId, RecomendacionItem[]> = {
  antes: [],
  durante: [],
  despues: [],
};

const EMERGENCIAS: Record<string, Emergencia> = {
  inundaciones: {
    titulo: 'Inundaciones',
    imagen: 'assets/image/inundaciones.png',
    fuente: 'Fuentes: SINAGIR, recomendaciones de prevención, actuación y recuperación ante inundaciones.',
    contenido: {
      antes: [
        {
          titulo: 'Mantené los desagües limpios',
          detalle: 'Retirá hojas, basura y otros elementos que puedan obstruir desagües, canaletas, acequias y bocas de tormenta.',
        },
        {
          titulo: 'Asegurá los objetos del exterior',
          detalle: 'Retirá de los alrededores de tu vivienda los elementos que puedan ser arrastrados por el agua.',
        },
        {
          titulo: 'Protegé los productos peligrosos',
          detalle: 'Guardá combustibles y productos químicos en lugares donde tengan menor riesgo de derramarse si ingresa agua.',
        },
        {
          titulo: 'Identificá las zonas seguras',
          detalle: 'Conocé los puntos de encuentro, las vías de evacuación y los lugares elevados a los que podrías dirigirte.',
        },
        {
          titulo: 'Prepará tu kit de emergencia',
          detalle: 'Guardá documentos importantes y tené disponibles una linterna, pilas, baterías y los teléfonos de Protección Civil y Bomberos.',
        },
      ],
      durante: [
        {
          titulo: 'Mantené la calma',
          detalle: 'Seguí las indicaciones de las autoridades y mantenete informado mediante canales oficiales.',
        },
        {
          titulo: 'Cortá los servicios de la vivienda',
          detalle: 'Si podés hacerlo sin exponerte al agua ni a riesgos eléctricos, cerrá las llaves de gas y agua y desconectá la electricidad.',
        },
        {
          titulo: 'Evacuá hacia una zona elevada',
          detalle: 'Dirigite a un lugar seguro y elevado. Evitá sótanos y plantas bajas. Si quedás atrapado, solicitá ayuda a Bomberos.',
        },
        {
          titulo: 'No atravieses zonas inundadas',
          detalle: 'No camines, nades ni circules en auto, moto o bicicleta por calles anegadas o cauces de agua.',
        },
        {
          titulo: 'Alejate de instalaciones eléctricas',
          detalle: 'No te acerques a postes ni cables. Informá a las autoridades si hay personas heridas o con movilidad reducida que necesiten ayuda para evacuar.',
        },
      ],
      despues: [
        {
          titulo: 'Esperá la autorización para regresar',
          detalle: 'No vuelvas a tu vivienda hasta que las autoridades indiquen que es seguro hacerlo.',
        },
        {
          titulo: 'Revisá la instalación eléctrica',
          detalle: 'Utilizá calzado aislante, verificá que la electricidad esté desconectada y nunca toques ni pises cables.',
        },
        {
          titulo: 'Comprobá el estado de la vivienda',
          detalle: 'Revisá paredes, pisos y techos para detectar posibles daños o riesgos de derrumbe. Prestá atención a productos químicos mojados y animales muertos.',
        },
        {
          titulo: 'Descartá los alimentos contaminados',
          detalle: 'No consumas alimentos que hayan estado en contacto con el agua de inundación. Utilizá agua potable segura.',
        },
        {
          titulo: 'Limpiá y desinfectá cuando baje el agua',
          detalle: 'Esperá a que el agua se retire antes de comenzar la limpieza. SINAGIR recomienda una taza de lavandina (tamaño pocillo de café) cada 10 litros de agua para limpiar superficies.',
        },
      ],
    },
  },
  tormentas: {
    titulo: 'Tormentas',
    imagen: 'assets/image/tormentas.png',
    fuente: 'Fuentes: SINAGIR, SMN, Gobierno de la Ciudad de Buenos Aires y recomendaciones de seguridad eléctrica del ENRE.',
    contenido: {
      antes: [
        {
          titulo: 'Consultá las alertas meteorológicas',
          detalle: 'Revisá los avisos del Servicio Meteorológico Nacional y las comunicaciones oficiales de tu localidad.',
        },
        {
          titulo: 'Mantené limpios los desagües',
          detalle: 'Retirá la basura de canaletas y sumideros. Evitá sacar residuos a la calle durante las alertas.',
        },
        {
          titulo: 'Asegurá los objetos del exterior',
          detalle: 'Guardá macetas, adornos, sillas y otros elementos que puedan ser desplazados por ráfagas fuertes.',
        },
        {
          titulo: 'Prepará elementos de emergencia',
          detalle: 'Tené una linterna, pilas, una radio y los celulares cargados para posibles cortes de energía.',
        },
        {
          titulo: 'Prepará un lugar de resguardo',
          detalle: 'Identificá un espacio cerrado y seguro. Evitá permanecer en balcones, patios o terrazas cuando se aproxime la tormenta.',
        },
      ],
      durante: [
        {
          titulo: 'Permanecé bajo techo',
          detalle: 'Quedate en construcciones cerradas, como viviendas o edificios. Evitá las actividades al aire libre.',
        },
        {
          titulo: 'Cerrá puertas y ventanas',
          detalle: 'Mantenete alejado de ventanas, puertas y objetos que puedan romperse o desprenderse por el viento.',
        },
        {
          titulo: 'Alejate de los artefactos eléctricos',
          detalle: 'Desconectá los electrodomésticos cuando sea seguro hacerlo. Evitá utilizar teléfonos con cable y manipular cañerías durante tormentas eléctricas.',
        },
        {
          titulo: 'Evitá el contacto con el agua y los árboles',
          detalle: 'Alejate de piletas, ríos, lagos y playas. No busques refugio debajo de árboles, estructuras metálicas o postes eléctricos.',
        },
        {
          titulo: 'Evitá circular por calles inundadas',
          detalle: 'No atravieses zonas anegadas. Si estás viajando en un vehículo cuando hay actividad eléctrica, permanecé en su interior.',
        },
      ],
      despues: [
        {
          titulo: 'Revisá los avisos oficiales',
          detalle: 'Antes de retomar tus actividades, consultá si continúan las alertas o si las autoridades emitieron nuevas indicaciones.',
        },
        {
          titulo: 'Alejate de cables caídos',
          detalle: 'No toques cables, postes ni instalaciones eléctricas dañadas. Informá el peligro a los servicios correspondientes.',
        },
        {
          titulo: 'Evitá las calles anegadas',
          detalle: 'Aunque la lluvia haya terminado, no atravieses sectores donde todavía haya agua acumulada.',
        },
        {
          titulo: 'Revisá los aparatos eléctricos afectados',
          detalle: 'No conectes electrodomésticos que hayan estado en contacto con el agua hasta que personal idóneo compruebe que funcionan de forma segura.',
        },
        {
          titulo: 'Comprobá el entorno de tu vivienda',
          detalle: 'Observá desde un lugar seguro si hay ramas, carteles, techos u otros elementos dañados que puedan desprenderse. Avisá a las autoridades si detectás situaciones peligrosas.',
        },
      ],
    },
  },
  sismos: {
    titulo: 'Sismos',
    imagen: 'assets/image/sismos.png',
    fuente: 'Fuentes: Instituto Nacional de Prevención Sísmica (INPRES).',
    contenido: {
      antes: [
        {
          titulo: 'Prepará un plan familiar',
          detalle: 'Acordá con tu familia cómo actuar, dónde encontrarse y qué hacer si ocurre un sismo.',
        },
        {
          titulo: 'Identificá las zonas seguras',
          detalle: 'Ubicá y señalizá los lugares seguros dentro y fuera de tu vivienda o lugar de trabajo.',
        },
        {
          titulo: 'Asegurá los objetos pesados',
          detalle: 'Fijá muebles, estanterías y objetos que puedan caer o desplazarse durante un movimiento sísmico.',
        },
        {
          titulo: 'Mantené libres las salidas',
          detalle: 'Despejá pasillos, puertas y vías de escape para facilitar una eventual evacuación.',
        },
        {
          titulo: 'Prepará los elementos de emergencia',
          detalle: 'Tené a mano un botiquín de primeros auxilios, linterna, radio a pilas y los números de emergencia.',
        },
      ],
      durante: [
        {
          titulo: 'Conservá la calma',
          detalle: 'No grites ni corras. Mantené la tranquilidad y seguí las medidas de protección previstas en tu plan.',
        },
        {
          titulo: 'Protegé tu cabeza y cuerpo',
          detalle: 'Buscá resguardo debajo de una mesa o mueble firme, o en una zona segura previamente identificada.',
        },
        {
          titulo: 'Alejate de ventanas y objetos que puedan caer',
          detalle: 'Mantenete lejos de vidrios, muebles altos, estanterías y elementos colgantes.',
        },
        {
          titulo: 'No utilices ascensores ni balcones',
          detalle: 'Permanecé en un lugar protegido. No intentes salir precipitadamente mientras continúa el movimiento.',
        },
        {
          titulo: 'Evitá correr hacia las salidas',
          detalle: 'Si estás en un cine, comercio u otro lugar concurrido, protegé tu cuerpo en el sitio y evitá generar aglomeraciones.',
        },
      ],
      despues: [
        {
          titulo: 'Comprobá si hay personas heridas',
          detalle: 'Verificá el estado de quienes te rodean y brindá primeros auxilios si tenés los conocimientos necesarios. No muevas heridos graves, salvo que exista peligro inmediato.',
        },
        {
          titulo: 'Movete con precaución',
          detalle: 'No camines descalzo ni a oscuras. Utilizá una linterna a pilas para iluminarte.',
        },
        {
          titulo: 'Revisá los servicios de la vivienda',
          detalle: 'Controlá si existen pérdidas de gas, agua o electricidad. No enciendas fósforos ni acciones interruptores si sospechás una fuga.',
        },
        {
          titulo: 'Alejate de edificios dañados',
          detalle: 'Si observás grietas o deterioros importantes, mantenete fuera del lugar y solicitá una evaluación profesional antes de regresar.',
        },
        {
          titulo: 'Seguí las indicaciones oficiales',
          detalle: 'Mantenete informado, no difundas rumores y respetá las instrucciones de las autoridades. Tené presente que pueden producirse nuevas sacudidas.',
        },
      ],
    },
  },
  incendios: {
    titulo: 'Incendios',
    imagen: 'assets/image/incendios.png',
    fuente: 'Fuentes: SINAGIR, Gobierno de la Ciudad de Buenos Aires, Ministerio de Salud de la Nación y Gobierno de Mendoza.',
    contenido: {
      antes: [
        {
          titulo: 'Mantené las fuentes de calor despejadas',
          detalle: 'Alejá repasadores, cortinas, papeles y otros materiales inflamables de cocinas, estufas y radiadores.',
        },
        {
          titulo: 'Almacená correctamente los productos inflamables',
          detalle: 'Guardá combustibles, pinturas y solventes lejos de fuentes de calor y evitá acumular sustancias combustibles dentro de ambientes cerrados.',
        },
        {
          titulo: 'Revisá las instalaciones de tu hogar',
          detalle: 'Solicitá a profesionales matriculados controles periódicos de las instalaciones eléctricas y de gas.',
        },
        {
          titulo: 'Contá con elementos de prevención',
          detalle: 'Instalá un detector de humo y disponé de un matafuegos adecuado. Aprendé a utilizarlo mediante una capacitación.',
        },
        {
          titulo: 'Prepará un plan de evacuación',
          detalle: 'Identificá salidas y vías de escape, mantenelas despejadas y compartí el plan con las personas que viven en tu hogar.',
        },
      ],
      durante: [
        {
          titulo: 'Avisá a los servicios de emergencia',
          detalle: 'Ante un incendio, llamá a Bomberos y solicitá ayuda. No demores la evacuación intentando salvar objetos materiales.',
        },
        {
          titulo: 'Utilizá el matafuegos solo si es seguro',
          detalle: 'Si el fuego es pequeño y estás capacitado, podés intentar utilizar el extintor. Si no conseguís controlarlo inmediatamente, evacuá.',
        },
        {
          titulo: 'Evacuá por las salidas seguras',
          detalle: 'Salí rápidamente, cerrá las puertas al retirarte si podés hacerlo sin riesgo y utilizá las escaleras. Nunca uses ascensores.',
        },
        {
          titulo: 'Protegete del humo',
          detalle: 'Si hay humo, desplazate agachado y cubrí tu nariz y boca con un paño. No atravieses escaleras o vías de escape invadidas por humo.',
        },
        {
          titulo: 'Si quedás atrapado, pedí ayuda',
          detalle: 'Refugiate en un lugar seguro lejos del fuego, sellá la entrada para evitar el ingreso de humo y gases y señalizá tu ubicación.',
        },
      ],
      despues: [
        {
          titulo: 'No regreses al lugar sin autorización',
          detalle: 'No ingreses nuevamente a la vivienda o edificio hasta que Bomberos confirme que es seguro.',
        },
        {
          titulo: 'Reunite en un lugar seguro',
          detalle: 'Permanecé en el punto de encuentro y verificá que todas las personas que estaban en el lugar hayan podido salir.',
        },
        {
          titulo: 'Seguí las instrucciones de las autoridades',
          detalle: 'Respetá las indicaciones de Bomberos y Defensa Civil. No interfieras con las tareas de emergencia.',
        },
        {
          titulo: 'No ingreses en zonas quemadas',
          detalle: 'En incendios forestales, las áreas afectadas pueden conservar focos calientes capaces de reactivarse. No regreses hasta que las autoridades lo permitan.',
        },
        {
          titulo: 'Cuidá tu salud después de la exposición al humo',
          detalle: 'Evitá permanecer en ambientes con humo y cenizas. Si tenés molestias respiratorias o pertenecés a un grupo de riesgo, buscá orientación en un centro de salud.',
        },
      ],
    },
  },
  'olas-calor': {
    titulo: 'Olas de calor',
    imagen: 'assets/image/olas-calor.png',
    fuente: 'Fuentes: Ministerio de Salud de la Nación y SINAGIR.',
    contenido: {
      antes: [
        {
          titulo: 'Consultá las alertas por temperaturas extremas',
          detalle: 'Revisá los avisos del Servicio Meteorológico Nacional y prestá atención al nivel de alerta para tu localidad.',
        },
        {
          titulo: 'Identificá a las personas más vulnerables',
          detalle: 'Prestá especial atención a bebés, niños, personas mayores, embarazadas y personas con enfermedades crónicas.',
        },
        {
          titulo: 'Asegurá el acceso a agua segura',
          detalle: 'Tené agua potable disponible y guardala en recipientes limpios y cerrados.',
        },
        {
          titulo: 'Prepará un ambiente fresco',
          detalle: 'Identificá los espacios ventilados o con aire acondicionado donde puedas resguardarte durante las horas de mayor temperatura.',
        },
        {
          titulo: 'Protegé también a tus mascotas',
          detalle: 'Asegurate de que tengan agua fresca y un lugar con sombra donde puedan permanecer.',
        },
      ],
      durante: [
        {
          titulo: 'Hidratate frecuentemente',
          detalle: 'Tomá agua segura con mayor frecuencia, incluso cuando no sientas sed.',
        },
        {
          titulo: 'Evitá bebidas y comidas que favorezcan la deshidratación',
          detalle: 'Limitá las bebidas alcohólicas, con cafeína o azúcar en exceso. Preferí frutas y verduras y evitá las comidas abundantes.',
        },
        {
          titulo: 'Reducí la actividad física',
          detalle: 'Evitá realizar ejercicios o esfuerzos físicos intensos durante los momentos de mayor temperatura.',
        },
        {
          titulo: 'Evitá la exposición directa al sol',
          detalle: 'Permanecé en lugares frescos y con sombra. Evitá exponerte al sol entre las 10 y las 16 horas y utilizá ropa liviana y clara.',
        },
        {
          titulo: 'Prestá especial atención a los grupos de riesgo',
          detalle: 'Ofrecé líquidos frecuentemente a niños y niñas, amamantá más seguido a los lactantes y vigilá cómo se sienten las personas mayores y quienes tienen enfermedades crónicas.',
        },
      ],
      despues: [
        {
          titulo: 'Continuá con la hidratación',
          detalle: 'Después de la exposición al calor, seguí tomando agua segura y descansá en un lugar fresco.',
        },
        {
          titulo: 'Prestá atención a los síntomas',
          detalle: 'Observá si aparecen sed intensa, debilidad, sudoración excesiva, dolor de cabeza, náuseas, vómitos o mareos.',
        },
        {
          titulo: 'Trasladá a la persona a un lugar fresco',
          detalle: 'Ante signos de agotamiento por calor, buscá un espacio ventilado o con aire acondicionado y permití que descanse.',
        },
        {
          titulo: 'Ayudá a bajar la temperatura corporal',
          detalle: 'Retirá el exceso de ropa y mojá el cuerpo con agua fresca o fría para ayudar a enfriarlo.',
        },
        {
          titulo: 'Solicitá atención médica urgente ante signos graves',
          detalle: 'Si hay temperatura elevada, piel muy caliente, confusión, desmayo o convulsiones, llamá inmediatamente a emergencias. Ofrecé agua únicamente si la persona está consciente. No administres antifebriles ni frotes la piel con alcohol.',
        },
      ],
    },
  },
  'viento-fuerte': {
    titulo: 'Viento fuerte',
    imagen: 'assets/image/vientos-fuertes.png',
    fuente: 'Fuentes: SINAGIR y Servicio Meteorológico Nacional (SMN).',
    contenido: {
      antes: [
        {
          titulo: 'Consultá las alertas meteorológicas',
          detalle: 'Revisá los avisos del SMN y las comunicaciones de las autoridades locales sobre vientos intensos y ráfagas.',
        },
        {
          titulo: 'Asegurá los objetos que puedan volarse',
          detalle: 'Retirá o sujetá macetas, sillas, toldos, chapas y otros elementos de balcones, patios y terrazas.',
        },
        {
          titulo: 'Prepará tu vivienda',
          detalle: 'Cerrá puertas y ventanas y verificá que no haya objetos sueltos que puedan desprenderse.',
        },
        {
          titulo: 'Prepará los elementos de emergencia',
          detalle: 'Tené disponibles agua potable, alimentos no perecederos, medicamentos, linterna, pilas y documentación importante. Cargá los celulares con anticipación.',
        },
        {
          titulo: 'Identificá un lugar seguro',
          detalle: 'Elegí un espacio cerrado donde puedas permanecer protegido y tené a mano los números de Protección Civil, Bomberos y Policía.',
        },
      ],
      durante: [
        {
          titulo: 'Evitá salir al exterior',
          detalle: 'Permanecé bajo techo y suspendé las actividades al aire libre mientras continúen las condiciones peligrosas.',
        },
        {
          titulo: 'Alejate de puertas y ventanas',
          detalle: 'Mantené cerradas las aberturas y ubicá a las personas en un sector interior protegido.',
        },
        {
          titulo: 'Evitá refugiarte debajo de estructuras inestables',
          detalle: 'No permanezcas cerca de árboles, postes, marquesinas, carteles publicitarios ni elementos que puedan caer.',
        },
        {
          titulo: 'Conducí con precaución',
          detalle: 'Reducí la velocidad y evitá maniobras bruscas. Si las ráfagas dificultan el control del vehículo, buscá detenerte en un lugar seguro, lejos de árboles y postes.',
        },
        {
          titulo: 'No te acerques a cables eléctricos',
          detalle: 'Mantené distancia de postes dañados, cables sueltos y elementos que puedan estar electrificados. Avisá a las autoridades.',
        },
      ],
      despues: [
        {
          titulo: 'Alejate de postes y cables caídos',
          detalle: 'No los toques ni te acerques a instalaciones eléctricas dañadas. Informá la situación a la distribuidora o a los servicios de emergencia.',
        },
        {
          titulo: 'No manipules ramas ni objetos sobre cables',
          detalle: 'Si hay árboles o elementos caídos cerca del tendido eléctrico, no intentes retirarlos por tu cuenta.',
        },
        {
          titulo: 'Comprobá los daños desde un lugar seguro',
          detalle: 'Observá si hay árboles inclinados, techos deteriorados, carteles sueltos u otros elementos que puedan desprenderse.',
        },
        {
          titulo: 'Mantenete informado sobre la situación',
          detalle: 'Consultá los canales oficiales para conocer el estado de las calles, los servicios y las recomendaciones de las autoridades.',
        },
        {
          titulo: 'Retomá las actividades con precaución',
          detalle: 'Antes de salir, verificá que no haya peligros en tu entorno y evitá circular por sectores afectados hasta que sean habilitados o considerados seguros.',
        },
      ],
    },
  },
};

@Component({
  selector: 'app-detalle-recomendacion',
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule],
  templateUrl: './detalle-recomendacion.page.html',
  styleUrls: ['./detalle-recomendacion.page.scss'],
})
export class DetalleRecomendacionPage {
  emergencia: Emergencia;
  imagenError = false;

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