import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, documentTextOutline, calendarOutline } from 'ionicons/icons';

import { SesionService } from '../../../services/sesion.service';
import { ReportesUsuarioService } from '../../../services/reportes-usuario.service';
import { DetalleReportePage } from './detalle-reporte/detalle-reporte';

@Component({
    selector: 'app-usuario-reportes',
    templateUrl: './usuario-reportes.html',
    styleUrls: ['./usuario-reportes.scss'],
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
        IonIcon
    ]
})
export class UsuarioReportesPage implements OnInit {

    reportes: any[] = [];
    cargando = true;

    constructor(
        private sesionService: SesionService,
        private reportesService: ReportesUsuarioService,
        private modalController: ModalController,
        private cdr: ChangeDetectorRef
    ) {
        addIcons({ chevronBackOutline, chevronForwardOutline, documentTextOutline, calendarOutline  });
    }

    ngOnInit() {
        const sesion: any = this.sesionService.usuario();
        const idUsuario = sesion?._id || sesion?.id;

        if (!idUsuario) {
            this.cargando = false;
            return;
        }

        this.reportesService.listarPorUsuario(idUsuario).subscribe({
            next: (data) => {
                this.reportes = data.sort((a: any, b: any) => {
                return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                });
                this.reportes = data;
                this.cargando = false;
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error al cargar los reportes', error);
                this.cargando = false;
                this.cdr.markForCheck();
            }
        });
    }

    async abrirDetalle(reporte: any) {
        const modal = await this.modalController.create({
            component: DetalleReportePage,
            componentProps: { reporte }
        });
        await modal.present();
    }

    esRevisado(estado: string): boolean {
        return (estado || '').toLowerCase().includes('revisado');
    }

    textoEstado(estado: string): string {
        if (this.esRevisado(estado)) return 'Revisado';
        if ((estado || '').toLowerCase().includes('revi')) return 'En revisión';
        return estado || '';
    }
}
