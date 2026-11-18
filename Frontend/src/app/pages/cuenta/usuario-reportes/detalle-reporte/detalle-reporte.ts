import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ModalController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, locationOutline, checkmarkCircleOutline, timeOutline, trashOutline } from 'ionicons/icons';
import { ReportesUsuarioService } from '../../../../services/reportes-usuario.service';
import type { ReporteUsuario } from '../../../../services/reportes-usuario.service';

@Component({
    selector: 'app-detalle-reporte',
    templateUrl: './detalle-reporte.html',
    styleUrls: ['./detalle-reporte.scss'],
    standalone: true,
    imports: [
        CommonModule,
        IonContent,
        IonHeader,
        IonToolbar,
        IonTitle,
        IonButtons,
        IonButton,
        IonIcon
    ]
})
export class DetalleReportePage {

    @Input() reporte!: ReporteUsuario;
    eliminando = false;

    private reportesService = inject(ReportesUsuarioService);
    private alertCtrl = inject(AlertController);
    private toastCtrl = inject(ToastController);

    constructor(private modalController: ModalController) {
        addIcons({ 
            closeOutline, 
            calendarOutline, 
            locationOutline,
            checkmarkCircleOutline,
            timeOutline,
            trashOutline
        });
    }

    cerrar() {
        this.modalController.dismiss();
    }

    async confirmarEliminacion() {
        const alerta = await this.alertCtrl.create({
            header: 'Eliminar reporte',
            message: '¿Estás seguro de que querés eliminar este reporte? Se quitará del mapa y no se podrá recuperar.',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: () => {
                        this.ejecutarEliminacion();
                    }
                }
            ]
        });
        await alerta.present();
    }

    private ejecutarEliminacion() {
        if (!this.reporte?._id) return;
        this.eliminando = true;
        this.reportesService.eliminarReporte(this.reporte._id).subscribe({
            next: async () => {
                this.eliminando = false;
                const toast = await this.toastCtrl.create({
                    message: 'Reporte eliminado correctamente',
                    duration: 3000,
                    color: 'success',
                    position: 'bottom'
                });
                await toast.present();
                await this.modalController.dismiss({ eliminado: true });
            },
            error: async (err) => {
                this.eliminando = false;
                const toast = await this.toastCtrl.create({
                    message: err?.error?.mensaje || 'No se pudo eliminar el reporte',
                    duration: 4000,
                    color: 'danger',
                    position: 'bottom'
                });
                await toast.present();
            }
        });
    }

    mostrarErrorFoto(event: Event): void {
        const imagen = event.target;
        if (!(imagen instanceof HTMLImageElement)) return;
        imagen.hidden = true;
        const aviso = document.createElement('span');
        aviso.className = 'foto-error';
        aviso.textContent = 'No se pudo cargar esta foto.';
        imagen.parentElement?.append(aviso);
    }

    textoEstado(reporte: ReporteUsuario): string {
        if (reporte?.estadoModeracion === 'rechazado') return 'Rechazado';
        if (reporte?.estadoVecinal === 'cerrado') return 'Cerrado';
        if (reporte?.estadoVecinal === 'confirmado') return 'Confirmado por vecinos';
        if (reporte?.fotos?.length && reporte?.estadoModeracion === 'pendiente') return 'Fotos en moderación';
        return 'Activo en mapa';
    }

    mensajeEstado(reporte: ReporteUsuario): string {
        if (reporte?.estadoModeracion === 'rechazado') {
            return reporte.motivoModeracion ? `El reporte fue rechazado: ${reporte.motivoModeracion}` : 'El reporte fue rechazado por los moderadores.';
        }
        if (reporte?.estadoVecinal === 'cerrado') {
            return 'Los vecinos indicaron que este incidente ya no está.';
        }
        if (reporte?.estadoVecinal === 'confirmado') {
            return 'Los vecinos confirmaron que este reporte sigue presente en el lugar.';
        }
        if (reporte?.fotos?.length && reporte?.estadoModeracion === 'pendiente') {
            return 'Tu reporte está publicado en el mapa. Las fotos están siendo revisadas por un moderador antes de ser visibles al público.';
        }
        return 'Tu reporte está visible para la comunidad en el mapa interactivo.';
    }
}