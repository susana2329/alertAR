import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonHeader, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-recomendaciones',
  templateUrl: './recomendaciones.page.html',
  styleUrls: ['./recomendaciones.page.scss'],
  imports: [CommonModule, IonContent, IonHeader, IonButton, IonIcon]
})
export class RecomendacionesPage {

  constructor(private location: Location) {
    addIcons({
      'arrow-back-outline': arrowBackOutline
    });
  }

  volver() {
    this.location.back();
  }
}