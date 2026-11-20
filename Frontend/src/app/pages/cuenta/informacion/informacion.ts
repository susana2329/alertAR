import { Component, OnInit, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonAvatar, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton,IonAccordionGroup, IonAccordion, IonItem } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, openOutline,informationCircleOutline, schoolOutline, heartOutline,homeOutline, mapOutline, fileTrayFullOutline, shieldOutline, personOutline, shareSocialOutline  } from 'ionicons/icons';

@Component({
  selector: 'app-informacion',
  templateUrl: './informacion.html',
  styleUrls: ['./informacion.scss'],
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
    IonTabButton,
    IonLabel,
    IonAccordion,
    IonAccordionGroup,
    IonItem
  ]
})
export class InformacionPage implements OnInit {
  readonly version = signal<string | null>(null);
  constructor() {
    addIcons({ chevronBackOutline,
      chevronForwardOutline,
      openOutline,
      informationCircleOutline,
      schoolOutline,
      heartOutline,
      shareSocialOutline
     });
  }

  async ngOnInit() {
    try {
      this.version.set((await App.getInfo()).version);
    } catch {
      // Evitar mostrar una versión inventada cuando no se puede consultar el APK.
      this.version.set(null);
    }
  }
}
