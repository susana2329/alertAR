import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonButtons, IonToggle, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';
import { SesionService } from '../../../services/sesion.service';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonButtons, IonToggle]
})
export class ConfiguracionPage implements OnInit {
  ubicacionActiva = false;
  private readonly sesionService = inject(SesionService);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ chevronBackOutline });
  }

  ngOnInit() {
    this.ubicacionActiva = this.sesionService.ubicacionPermitida();
  }

  async onUbicacionChange(event: CustomEvent<{ checked: boolean }>) {
    if (event.detail.checked) {
      this.ubicacionActiva = await this.sesionService.pedirUbicacion();
      if (!this.ubicacionActiva) this.sesionService.guardarUbicacion(false);
      return;
    }

    this.ubicacionActiva = false;
    this.sesionService.guardarUbicacion(false);
    const toast = await this.toastController.create({
      message: 'Al desactivar la ubicación, perderás precisión en las alertas de tu zona',
      duration: 5000,
      position: 'bottom',
      color: 'dark',
      buttons: [{ text: 'Entendido', role: 'cancel' }]
    });
    await toast.present();
  }
}
