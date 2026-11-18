import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonIcon,
  IonContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

interface CategoriaEmergencia {
  id: string;
  nombre: string;
  icono: string;
  activa?: boolean;
}

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonIcon,
    IonContent
  ],
  templateUrl: './recomendaciones.page.html',
  styleUrls: ['./recomendaciones.page.scss']
})
export class RecomendacionesPage {

  categorias: CategoriaEmergencia[] = [
    { id: 'inundaciones', nombre: 'Inundaciones', icono: 'assets/icon/inundaciones.png' },
    { id: 'tormentas', nombre: 'Tormentas', icono: 'assets/icon/tormentas.png' },
    { id: 'sismos', nombre: 'Sismos', icono: 'assets/icon/sismos.png' },
    { id: 'incendios', nombre: 'Incendios', icono: 'assets/icon/incendios.png' },
    { id: 'olas-calor', nombre: 'Olas de calor', icono: 'assets/icon/olas-calor.png' },
    { id: 'viento-fuerte', nombre: 'Viento fuerte', icono: 'assets/icon/viento-fuerte.png' },
  ];

  constructor(private router: Router) {
    addIcons({
      'arrow-back-outline': arrowBackOutline
    });
  }

  volver(): void {
    this.router.navigate(['/inicio']);
  }

  verCategoria(categoria: CategoriaEmergencia): void {
    this.router.navigate(['/inicio/recomendaciones', categoria.id]);
  }
}