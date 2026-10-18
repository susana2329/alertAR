import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonAvatar, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logOutOutline,chevronBackOutline, homeOutline,mapOutline,bookmarkOutline,fileTrayFullOutline,personOutline,shieldOutline  } from 'ionicons/icons';

import { MOCK_USER } from '../../mocks/usuario.mock';
import { UserProfile } from '../../models/usuario.model';

@Component({
  selector: 'app-cuenta',
  templateUrl: './cuenta.html',
  styleUrls: ['./cuenta.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle, 
    IonAvatar,
    IonIcon,
    IonButtons,
    IonButton,
    IonTabBar,
    IonLabel,
    IonTabButton
]
})
export class CuentaPage implements OnInit {
  user = MOCK_USER;
  constructor(
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      chevronForwardOutline,
      logOutOutline,
      chevronBackOutline,
      homeOutline,
      mapOutline,
      fileTrayFullOutline,
      personOutline,
      bookmarkOutline,
      shieldOutline
    });

  }


  ngOnInit() {
    console.log('CuentaPage funcionando correctamente');
  }


  async confirmarCerrarSesion(){
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que querés cerrar sesión?',
      buttons:[
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Cierre de sesión cancelado');
          }
        },
        {
          text: 'Si, cerrar sesión',
          role: 'cancel',
          handler: () => {
            localStorage.removeItem('usuarioLogueado');
            this.router.navigate(['/home']);
          }
        }
      ]
    });
    await alert.present();

  }
}