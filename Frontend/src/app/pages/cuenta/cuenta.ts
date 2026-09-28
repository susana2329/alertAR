import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonAvatar, IonRouterLink, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

import { MOCK_USER } from '../../mocks/usuario.mock';
import { UserProfile } from '../../models/usuario.model';

@Component({
  selector: 'app-cuenta',
  templateUrl: './cuenta.html',
  styleUrls: ['./cuenta.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonAvatar,
    IonRouterLink,
    IonIcon
]
})
export class CuentaPage implements OnInit {
  user = MOCK_USER;
  constructor() {
    addIcons({
      chevronForwardOutline
    });

  }


  ngOnInit() {
    console.log('CuentaPage funcionando correctamente');
  }

}