import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IonContent, IonHeader, IonToolbar, IonTitle, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton, IonToggle, IonSelectOption,IonSelect, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, notificationsOutline, medkitOutline, documentTextOutline, briefcaseOutline,locateOutline,syncOutline, key} from 'ionicons/icons';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.scss'],
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
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonTabButton,
    IonToggle
]
})
export class ConfiguracionPage implements OnInit {
  constructor( private toastController:ToastController) {
    addIcons({ 
      chevronBackOutline,
      chevronForwardOutline,
      notificationsOutline,
      medkitOutline,
      documentTextOutline,
      briefcaseOutline,
      locateOutline,
      syncOutline
     });
  }

  ngOnInit() {}

  async onUbicacionChange (event:any){
    const isChecked = event.detail.checked;

    if(!isChecked){
      const toast= await this.toastController.create({
        message:'Al desactivar la ubicación, perderás precisión en las alertas de tu zona',
        duration: 5000,
        position: 'bottom',
        color: 'dark',
        buttons: [{
          text: 'Entendido',
          role: 'cancel'
          }
        ]
      });
      await toast.present();
    }
  }

  async onFrecuenciaChange(event:any){
    const valorSeleccionado = event.detail.value;

    const textosFrecuencia: {[key:string]: string} ={
      '30m':'Cada 30 minutos',
      '1h':'Cada 1 hora',
      '2h':'Cada 2 horas',
      '5h':'Cada 5 horas',
      '10h':'Cada 10 horas',
      '24h':'Cada 24 horas'
    };

    const textoLegible = textosFrecuencia[valorSeleccionado] || valorSeleccionado;
    const toast = await this.toastController.create({
      message: `Frecuencia de sincronización actualizada: ${textoLegible}`,
      duration: 5000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

}