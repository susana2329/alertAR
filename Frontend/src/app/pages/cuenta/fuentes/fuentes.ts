import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonLabel, IonAccordionGroup, IonAccordion, IonItem } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, openOutline } from 'ionicons/icons';

interface FuenteOficial {
  value: string;
  nombre: string;
  subtitulo: string;
  icono: string;
  queEs: string;
  porQueUsamos: string;
  url: string;
}

interface SeccionFuentes {
  categoria: string;
  descripcionCategoria: string;
  fuentes: FuenteOficial[];
}

@Component({
  selector: 'app-fuentes',
  templateUrl: './fuentes.html',
  styleUrls: ['./fuentes.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonAccordionGroup,
    IonAccordion,
    IonItem
  ]
})
export class FuentesPage implements OnInit {

  public seccionesFuentes: SeccionFuentes[] = [
    {
      categoria: 'Clima, Hidrografía y Sismicidad',
      descripcionCategoria: 'Monitoreo ambiental, pronósticos oficiales y alertas tempranas.',
      fuentes: [
        {
          value: 'smn',
          nombre: 'SMN',
          subtitulo: 'Servicio Meteorológico Nacional',
          icono: 'assets/icon/icono-fuentes-smn.png',
          queEs: 'Organismo oficial del Estado argentino encargado de dirigir la actividad meteorológica y geofísica, brindando pronósticos actualizados.',
          porQueUsamos: 'Nos conecta con datos climáticos certificados y alertas tempranas oficiales para tormentas y riesgos meteorológicos.',
          url: 'https://www.argentina.gob.ar/smn'
        },
        {
          value: 'inpres',
          nombre: 'INPRES',
          subtitulo: 'Instituto Nacional de Prevención Sísmica',
          icono: 'assets/icon/icono-fuentes-inpres.png',
          queEs: 'Organismo científico-técnico encargado de registrar, investigar y explicar la actividad sísmica en Argentina.',
          porQueUsamos: 'Permite ofrecer información y notificaciones en tiempo real sobre movimientos telúricos y normas de construcción sismorresistente.',
          url: 'https://www.inpres.gob.ar/'
        },
        {
          value: 'ina',
          nombre: 'INA',
          subtitulo: 'Instituto Nacional del Agua',
          icono: 'assets/icon/icono-fuentes-ina.png',
          queEs: 'Organismo científico especializado en la investigación y gestión de recursos hídricos y pronósticos de crecidas.',
          porQueUsamos: 'Otorga respaldo técnico oficial para advertir sobre desbordes de ríos, crecidas y alertas hídricas críticas.',
          url: 'https://www.argentina.gob.ar/obraspublicas/ina'
        }
      ]
    },
    {
      categoria: 'Gestión de Emergencias y Protección Civil',
      descripcionCategoria: 'Protocolos nacionales y monitoreo de amenazas.',
      fuentes: [
        {
          value: 'sinagir',
          nombre: 'SINAGIR',
          subtitulo: 'Sistema Nacional para la Gestión Integral del Riesgo',
          icono: 'assets/icon/icono-fuentes-sinagir.png',
          queEs: 'Sistema nacional que articula las acciones de prevención, mitigación y respuesta ante desastres en el país.',
          porQueUsamos: 'Integra los protocolos oficiales de protección civil asegurando que las recomendaciones de la app se alineen a la estrategia nacional.',
          url: 'https://www.argentina.gob.ar/sinagir'
        },
        {
          value: 'siname',
          nombre: 'SINAME',
          subtitulo: 'Sistema Nacional de Monitoreo de Amenazas y Alertas',
          icono: 'assets/icon/icono-fuentes-siname.png',
          queEs: 'Plataforma estatal dedicada al seguimiento y evaluación de amenazas naturales o antrópicas.',
          porQueUsamos: 'Centraliza reportes de múltiples peligros ambientales para emitir avisos preventivos tempranos.',
          url: 'https://www.argentina.gob.ar/seguridad/emergencias'
        },
        {
          value: 'gcba',
          nombre: 'Gobierno de la Ciudad de Buenos Aires',
          subtitulo: 'Riesgo pluvial y alertas en CABA',
          icono: 'assets/icon/icono-fuentes-gcba.png',
          queEs: 'Área de monitoreo urbano local encargada de vigilar el sistema pluvial y anegamientos en CABA.',
          porQueUsamos: 'Otorga precisión geolocalizada para advertir sobre calles inundadas o anegamientos urbanos locales.',
          url: 'https://buenosaires.gob.ar'
        }
      ]
    },
    {
      categoria: 'Preparación de Kits y Mochilas de Emergencia',
      descripcionCategoria: 'Estándares nacionales y guías oficiales para el hogar y la comunidad.',
      fuentes: [
        {
          value: 'cruz-roja',
          nombre: 'Cruz Roja',
          subtitulo: 'Cruz Roja Argentina / Movimiento Internacional',
          icono: 'assets/icon/mochila.png',
          queEs: 'Organización humanitaria internacional referente en primeros auxilios, gestión de desastres y apoyo comunitario.',
          porQueUsamos: 'Respalda los lineamientos de botiquines de primeros auxilios, la adaptación de mochilas familiares y la atención a grupos vulnerables.',
          url: 'https://www.cruzroja.org.ar/'
        }
      ]
    }
  ];

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      openOutline
    });
  }

  ngOnInit() { }
}