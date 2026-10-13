import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonTabBar, IonTabButton, IonLabel, IonAccordionGroup,IonAccordion,IonItem } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, homeOutline, mapOutline, fileTrayFullOutline, shieldOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-fuentes',
  templateUrl: './fuentes.html',
  styleUrls: ['./fuentes.css'],
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
    IonTabBar,
    IonTabButton,
    IonLabel,
    IonAccordionGroup,
    IonAccordion,
    IonItem
  ]
})
export class FuentesPage implements OnInit {
  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      homeOutline,
      mapOutline,
      fileTrayFullOutline,
      shieldOutline,
      personOutline
    });
  }

  ngOnInit() { }
}