import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonAvatar, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton,IonAccordionGroup, IonAccordion, IonItem } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, openOutline,informationCircleOutline, schoolOutline, shareSocialOutline, heartOutline,homeOutline, mapOutline, fileTrayFullOutline, shieldOutline, personOutline  } from 'ionicons/icons';

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
  constructor() {
    addIcons({ chevronBackOutline,
      chevronForwardOutline,
      openOutline,
      informationCircleOutline,
      schoolOutline,shareSocialOutline, 
      heartOutline
     });
  }

  ngOnInit() {}
}