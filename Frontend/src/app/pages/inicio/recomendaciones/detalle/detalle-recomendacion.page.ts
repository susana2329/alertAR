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
  tormentas: {
    titulo: 'Tormentas',
    contenido: {
      antes: [
        'Seguí los pronósticos del SMN y las alertas oficiales',
        'Asegurá objetos sueltos en terrazas, balcones y jardines',
        'Revisá techos y desagües; destapá canaletas y rejillas',
        'Armá una mochila de emergencia con linterna, agua y botiquín',
        'Acordá con tu familia un punto de encuentro en caso de separarse',
        'Anotá los teléfonos de emergencia: 911, 100 (Bomberos), 103 (Defensa Civil), 107 (SAME)',
      ],
      durante: [
        'Quedáte adentro y alejate de ventanas y puertas de vidrio',
        'No salgas a la calle hasta que pase la tormenta',
        'Si estás afuera, buscá refugio en un edificio sólido; evitá árboles y estructuras metálicas',
        'Desconectá aparatos eléctricos y no los toques si hay riesgo de inundación',
        'No cruces zonas anegadas, ni a pie ni en auto',
        'Seguí las indicaciones de Defensa Civil y no difundas rumores',
      ],
      despues: [
        'Revisá tu casa en busca de daños estructurales antes de entrar',
        'No toques cables eléctricos caídos; avisá a Edesur/Edenor o a la empresa de energía local',
        'Sacá fotos de los daños para gestionar seguros o ayuda municipal',
        'Evitá circular por calles aún inundadas o con árboles caídos',
        'Ayudá a vecinos vulnerables y seguí los canales oficiales de información',
      ],
    },
  },
  sismos: {
    titulo: 'Sismos',
    contenido: {
      antes: [
        'Identificá las zonas seguras de tu hogar: bajo marcos de puertas o junto a paredes maestras',
        'Asegurá estantes, bibliotecas y electrodomésticos a la pared',
        'Guardá objetos pesados en los estantes más bajos',
        'Armá una mochila de emergencia con agua, alimentos, linterna y botiquín',
        'Practicá con tu familia el simulacro de "agachate, cubrí y agarrate"',
        'Conocé la ubicación de la llave de gas y el tablero eléctrico',
      ],
      durante: [
        'Agachate, cubrí tu cabeza y cuello, y agarrate de algo firme',
        'Alejate de ventanas, espejos y objetos que puedan caer',
        'No uses el ascensor; si estás en escaleras, agarráte del pasamanos',
        'Si estás afuera, alejate de edificios, postes y cables eléctricos',
        'Si manejás, detenéte lejos de puentes y tendidos eléctricos',
        'No corras hacia la salida durante el temblor',
      ],
      despues: [
        'Revisá si hay heridos y prestá primeros auxilios básicos',
        'Cerrá la llave de gas si olés gas; abrí ventanas y no enciendas fuego',
        'No uses aparatos eléctricos si hay riesgo de escape de gas',
        'Evacuá el edificio si hay daños estructurales visibles',
        'Esperá réplicas y mantené la calma',
        'Seguí las instrucciones de Defensa Civil y no vuelvas a zonas de riesgo',
      ],
    },
  },
  incendios: {
    titulo: 'Incendios',
    contenido: {
      antes: [
        'Instalá detectores de humo en cada piso de tu hogar y revisalos cada 6 meses',
        'Tené un matafuego en la cocina y en el garage; aprendé a usarlo',
        'Planificá una ruta de evacuación y practicala con tu familia',
        'No sobrecargues tomacorrientes ni uses enchufes en mal estado',
        'Guardá materiales inflamables (pinturas, gas envasado) en lugares ventilados y alejados del calor',
        'Mantené libre de maleza los alrededores de tu casa en zonas rurales o de interfaz',
      ],
      durante: [
        'Avisá al 100 (Bomberos) o al 911 inmediatamente',
        'Si el fuego es pequeño y sabés usar el matafuego, actuá; si no, evacuá',
        'Cerrá las puertas al salir para retardar la propagación del fuego',
        'Desplazate agachado si hay humo: el aire más limpio está cerca del suelo',
        'Nunca uses el ascensor; usá las escaleras de emergencia',
        'Si no podés salir, sellá las ranuras de puertas con telas húmedas y hacé señas desde la ventana',
      ],
      despues: [
        'No vuelvas al lugar hasta que los bomberos lo autoricen',
        'No uses el edificio si hay daños estructurales visibles',
        'Atendé posibles intoxicaciones por humo: buscá atención médica si hay dificultad para respirar',
        'Documentá los daños con fotos para seguros o asistencia municipal',
        'Verificá instalaciones eléctricas y de gas antes de reconnectarlas',
      ],
    },
  },
  'olas-calor': {
    titulo: 'Olas de calor',
    contenido: {
      antes: [
        'Seguí los avisos del SMN sobre temperaturas extremas',
        'Preparé tu casa: colocá reflectivos en ventanas y aireá los ambientes a la noche',
        'Stockeá agua y alimentos frescos en cantidad suficiente',
        'Identificá los centros de hidratación o espacios con aire acondicionado en tu barrio',
        'Chequeá a vecinos mayores, con enfermedades crónicas o sin acceso a refrigeración',
        'Revisá el estado de los ventiladores y aires acondicionados con anticipación',
      ],
      durante: [
        'Hidratáte frecuentemente aunque no sientas sed; evitá el alcohol y las bebidas muy azucaradas',
        'Quedáte en ambientes frescos entre las 11 y las 17 hs',
        'Usá ropa liviana, holgada y de colores claros',
        'Mojáte la cabeza, cuello y muñecas con agua fresca',
        'No dejés niños, adultos mayores ni mascotas dentro de vehículos estacionados',
        'Ante mareos, piel roja y seca o confusión, llamá al 107 (SAME): puede ser un golpe de calor',
      ],
      despues: [
        'Seguí hidratándote aunque bajen las temperaturas',
        'Revisá a las personas vulnerables de tu entorno',
        'Continuá ventilando los espacios durante la noche',
        'Consulta médica si tuviste síntomas de golpe de calor',
        'Informate sobre próximas olas a través de canales oficiales para anticiparte',
      ],
    },
  },
  'viento-fuerte': {
    titulo: 'Viento fuerte',
    contenido: {
      antes: [
        'Seguí los alertas del SMN sobre vientos fuertes o zonda',
        'Asegurá o guardá objetos sueltos en terrazas, balcones y jardines (macetas, muebles, toldos)',
        'Revisá el estado del techo y las antenas; fijá lo que pueda desprenderse',
        'Podá ramas secas o débiles de los árboles cercanos a tu casa',
        'Preparé una mochila de emergencia con linterna, agua y documentos',
        'Cargá el celular y tené una radio a pilas por si falla la electricidad',
      ],
      durante: [
        'Quedáte adentro y alejate de ventanas grandes',
        'No salgas a la calle innecesariamente, especialmente en moto o bicicleta',
        'Si manejás, reducí la velocidad y prestá atención a objetos voladores y ramas',
        'Alejáte de árboles, postes y carteles que puedan caer',
        'Evitá zonas de obras en construcción',
        'Seguí las instrucciones de Defensa Civil y no difundas información no verificada',
      ],
      despues: [
        'Revisá tu propiedad en busca de daños antes de circular por los alrededores',
        'No toques cables eléctricos caídos; informá a la empresa distribuidora de energía',
        'Revisá techos, canaletas y antenas que puedan haberse desprendido',
        'Documentá los daños con fotos para gestionar seguros o asistencia municipal',
        'Ayudá a vecinos vulnerables y verificá el estado de las mascotas',
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

  toggle(id: SeccionId): void {
    this.abiertas[id] = !this.abiertas[id];
  }

  volver(): void {
    this.router.navigate(['/inicio/recomendaciones']);
  }
}
