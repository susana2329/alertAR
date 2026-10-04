import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonSearchbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  waterOutline,
  thunderstorm,
  pulseOutline,
  flameOutline,
  sunnyOutline,
  home,
  mapOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  personOutline,
} from 'ionicons/icons';

addIcons({
  'arrow-back-outline': arrowBackOutline,
  'water-outline': waterOutline,
  thunderstorm,
  'pulse-outline': pulseOutline,
  'flame-outline': flameOutline,
  'sunny-outline': sunnyOutline,
  home,
  'map-outline': mapOutline,
  'document-text-outline': documentTextOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'person-outline': personOutline,
});

interface CategoriaEmergencia {
  id: string;
  nombre: string;
  icon: string;
  iconColor: string;
  activa?: boolean;
}

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSearchbar,
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './recomendaciones.page.html',
  styleUrls: ['./recomendaciones.page.scss']
})
export class RecomendacionesPage {

  terminoBusqueda = '';

  // "activa: true" marca la categoría resaltada porque coincide con la
  // alerta climática actual (ej: vino desde una alerta de lluvias intensas).
  categorias: CategoriaEmergencia[] = [
    { id: 'inundaciones', nombre: 'Inundaciones', icon: 'water-outline', iconColor: '#03294F' },
    { id: 'tormentas', nombre: 'Tormentas', icon: 'thunderstorm', iconColor: '#FFFFFF', activa: true },
    { id: 'sismos', nombre: 'Sismos', icon: 'pulse-outline', iconColor: '#79A288' },
    { id: 'incendios', nombre: 'Incendios', icon: 'flame-outline', iconColor: '#EE4129' },
    { id: 'olas-calor', nombre: 'Olas de calor', icon: 'sunny-outline', iconColor: '#F2A93B' },
    { id: 'viento-fuerte', nombre: 'Viento fuerte', icon: 'viento-custom', iconColor: '#0E7490' },
  ];

  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/inicio']);
  }

  verCategoria(categoria: CategoriaEmergencia): void {
    // TODO: this.router.navigate(['/inicio/recomendaciones', categoria.id]); cuando exista el detalle
  }
}