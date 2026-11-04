import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, Router } from "@angular/router";

import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonTabBar, IonTabButton, IonLabel, AlertController } from "@ionic/angular";
import { addIcons } from "ionicons";
import { chevronBackOutline, cameraOutline, informationCircleOutline, personOutline, mailOutline, logoGoogle, homeOutline, mapOutline, fileTrayFullOutline, shieldOutline, trashOutline } from "ionicons/icons";

import { UsuarioPerfil } from "../../../models/usuario.model";
import { PersonalService } from "../../../services/usuario.service";
import { SesionService } from "../../../services/sesion.service";
@Component({
    selector: 'app-perfil',
    templateUrl: './perfil.html',
    styleUrls: ['./perfil.scss'],
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
        IonTabButton,
        IonLabel,
        IonTabBar,
    ]
})
export class PerfilPage implements OnInit {

    public usuario: UsuarioPerfil | null = null;

    constructor(
        private alertController: AlertController,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private personalService: PersonalService,
        private sesionService: SesionService
    ) {
        addIcons({
            chevronBackOutline,
            cameraOutline,
            informationCircleOutline,
            personOutline,
            mailOutline,
            logoGoogle,
            homeOutline,
            mapOutline,
            fileTrayFullOutline,
            shieldOutline,
            trashOutline
        });
    }
    get iniciales(): string {
        const n = this.usuario?.nombre?.charAt(0) ?? '';
        const a = this.usuario?.apellido?.charAt(0) ?? '';
        return (n + a).toUpperCase();
    }

    ngOnInit() {
        console.log('PerfilPage funcionando correctamente');
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

    async confirmarEliminarCuenta() {
        const alert = await this.alertController.create({
            header: '¿Estás seguro?',
            message: 'Esta acción eliminará tu cuenta de AlertAR de forma permanente.',
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel',
                    cssClass: 'secondary',
                    handler: () => {
                        console.log('Eliminación cancelada');
                    }
                },
                {
                    text: 'Si, eliminar cuenta',
                    cssClass: 'danger-alert-button',
                    handler: () => {
                        this.router.navigate(['/acceso']);
                    }
                }
            ]
        });
        await alert.present();
    }
}
