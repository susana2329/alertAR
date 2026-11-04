import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { SesionService } from '../../services/sesion.service';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonAvatar, IonRouterLink, IonIcon, IonButton, IonButtons, IonTabBar, IonLabel, IonTabButton, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logOutOutline, chevronBackOutline, homeOutline, mapOutline, bookmarkOutline, fileTrayFullOutline, personOutline, shieldOutline } from 'ionicons/icons';
import { UsuarioPerfil } from '../../models/usuario.model';
import { PersonalService } from '../../services/usuario.service';


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
  public usuario: UsuarioPerfil | null = null;
  constructor(
    private router: Router,
    private alertController: AlertController,
    private personalService: PersonalService,
    private sesionService: SesionService,
    private cdr: ChangeDetectorRef

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
      get iniciales(): string {
        const n = this.usuario?.nombre?.charAt(0) ?? '';
        const a = this.usuario?.apellido?.charAt(0) ?? '';
        return (n + a).toUpperCase();
    }


  ngOnInit() {
    console.log('CuentaPage funcionando correctamente');
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    const sesion: any = this.sesionService.usuario();
    const idUsuario = sesion?._id || sesion?.id;
  if (!idUsuario) {
    if (sesion) {
      this.usuario = {
        _id: '',
        nombre: sesion.nombre ?? '',
        apellido: sesion.apellido ?? '',
        email: sesion.email ?? '',
        foto: sesion.foto ?? ''
      };
      this.cdr.markForCheck();
    }
    return;
  }

    this.personalService.obtenerDatosUsuario(idUsuario).subscribe({
      next: (data: UsuarioPerfil) => {
        this.usuario = data;
        this.cdr.markForCheck();
        console.log('Datos de cuenta cargados con éxito', data);
      },
      error: (error) => {
        console.error('Error al cargar los datos de la cuenta', error);
      }
    });
  }

  async confirmarCerrarSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que querés cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Cierre de sesión cancelado');
          }
        },
        {
          text: 'Si, cerrar sesión',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('usuarioLogueado');

            this.sesionService.cerrarSesion();

            this.router.navigate(['/acceso'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();

  }
}