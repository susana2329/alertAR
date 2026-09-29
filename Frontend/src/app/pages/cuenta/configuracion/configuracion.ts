import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logOutOutline,chevronBackOutline, homeOutline,mapOutline,bookmarkOutline,fileTrayFullOutline,personOutline,shieldOutline  } from 'ionicons/icons';

@Component({
  selector: 'app-fuentes',
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle, 
    IonIcon,
    IonButtons,
    IonButton,
    IonTabBar,
    IonLabel,
    IonTabButton
]
})
export class ConfiguracionPage implements OnInit {
  constructor() {
    addIcons({ chevronBackOutline });
  }

  ngOnInit() {}
}