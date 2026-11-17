import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, Router } from "@angular/router";

import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonTabBar, IonTabButton, IonLabel, AlertController, ActionSheetController } from "@ionic/angular";
import { addIcons } from "ionicons";
import { chevronBackOutline, cameraOutline, informationCircleOutline, personOutline, mailOutline, logoGoogle, homeOutline, mapOutline, fileTrayFullOutline, shieldOutline, trashOutline, imageOutline, closeOutline } from "ionicons/icons";

import { UsuarioPerfil } from "../../../models/usuario.model";
import { PersonalService } from "../../../services/usuario.service";
import { SesionService } from "../../../services/sesion.service";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ModalPhotosComponent } from "../../../components/modal-photos/modal-photos.component";

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
    public datosSinActualizar = false;

    constructor(
        private alertController: AlertController,
        private actionSheetController: ActionSheetController,
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
            trashOutline,
            imageOutline,
            closeOutline
        });
    }

    get iniciales(): string {
        const n = this.usuario?.nombre?.charAt(0) ?? '';
        const a = this.usuario?.apellido?.charAt(0) ?? '';
        return (n + a).toUpperCase();
    }

    ngOnInit() {
        this.cargarDatosUsuario();
    }

    cargarDatosUsuario() {
        const sesion = this.sesionService.usuario();
        const idUsuario = sesion?._id || sesion?.id;
        if (sesion) {
            this.usuario = {
                _id: idUsuario ?? '',
                nombre: sesion.nombre ?? '',
                apellido: sesion.apellido ?? '',
                email: sesion.email ?? '',
                foto: sesion.foto ?? '',
                proveedor: sesion.proveedor
            };
            this.cdr.markForCheck();
        }
        if (!idUsuario) return;

        this.personalService.obtenerDatosUsuario(idUsuario).subscribe({
            next: (data: UsuarioPerfil) => {
                this.usuario = data;
                this.datosSinActualizar = false;
                this.sesionService.actualizarUsuario({
                    id: data._id, nombre: data.nombre, apellido: data.apellido,
                    email: data.email, foto: data.foto, proveedor: data.proveedor
                });
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error al cargar los datos de la cuenta', error);
                this.datosSinActualizar = true;
                this.cdr.markForCheck();
            }
        });
    }

    async cambiarFotoPerfil() {
        const actionSheet = await this.actionSheetController.create({
            header: 'Actualizar foto de perfil',
            buttons: [
                {
                    text: 'Tomar una foto',
                    icon: 'camera-outline',
                    handler: () => {
                        this.procesarFoto(CameraSource.Camera);
                    }
                },
                {
                    text: 'Seleccionar de la galería',
                    icon: 'image-outline',
                    handler: () => {
                        this.procesarFoto(CameraSource.Photos);
                    }
                },
                {
                    text: 'Cancelar',
                    role: 'cancel',
                    icon: 'close-outline'
                }
            ]
        });
        await actionSheet.present();
    }

    async procesarFoto(source: CameraSource) {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Base64,
                source: source
            });

            const imagenBase64 = `data:image/jpeg;base64,${image.base64String}`;
            const sesion: any = this.sesionService.usuario();
            const idUsuario = sesion?._id || sesion?.id;

            if (!idUsuario) return;

            this.personalService.actualizarFotoPerfil(idUsuario, { fotoPerfil: imagenBase64 }).subscribe({
                next: (usuarioActualizado: any) => {
                    if (this.usuario) {
                        this.usuario.foto = usuarioActualizado.fotoPerfil || imagenBase64;
                        this.sesionService.actualizarUsuario({ foto: this.usuario.foto });
                    }
                    this.cdr.markForCheck();
                },
                error: (err: any) => {
                    console.error('Error al actualizar la foto en el servidor', err);
                }
            });

        } catch {
        }
    }

    async confirmarEliminarCuenta() {
        const alert = await this.alertController.create({
            header: '¿Estás seguro?',
            message: 'Esta acción eliminará tu cuenta de AlertAR de forma permanente.',
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel',
                    cssClass: 'secondary'
                },
                {
                    text: 'Si, eliminar cuenta',
                    cssClass: 'danger-alert-button',
                    handler: () => {
                        const sesion: any = this.sesionService.usuario();
                        const idUsuario = sesion?._id || sesion?.id;

                        if (!idUsuario) {
                            this.sesionService.cerrarSesion();
                            this.router.navigate(['/acceso']);
                            return;
                        }

                        this.personalService.eliminarCuenta(idUsuario).subscribe({
                            next: () => {
                                this.sesionService.cerrarSesion();
                                this.router.navigate(['/acceso']);
                            },
                            error: async (err: any) => {
                                console.error('Error al eliminar la cuenta', err);
                                const errorAlert = await this.alertController.create({
                                    header: 'Error',
                                    message: 'No se pudo eliminar la cuenta. Intentá de nuevo más tarde.',
                                    buttons: ['Aceptar']
                                });
                                await errorAlert.present();
                            }
                        });
                    }
                }
            ]
        });
        await alert.present();
    }
}
