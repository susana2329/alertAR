import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, documentTextOutline, calendarOutline } from 'ionicons/icons';

import { SesionService } from '../../../services/sesion.service';
import { ReportesUsuarioService } from '../../../services/reportes-usuario.service';
import type { ReporteUsuario } from '../../../services/reportes-usuario.service';
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

    reportes: ReporteUsuario[] = [];
    cargando = true;
    errorCarga: string | null = null;

    constructor(
        private sesionService: SesionService,
        private reportesService: ReportesUsuarioService,
        private modalController: ModalController,
        private cdr: ChangeDetectorRef
    ) {
        addIcons({ chevronBackOutline, chevronForwardOutline, documentTextOutline, calendarOutline  });
    }

    ngOnInit() {
        if (!this.sesionService.usuario()) {
            this.cargando = false;
            this.errorCarga = 'Iniciá sesión para consultar tus reportes.';
            return;
        }

        this.cargarReportes();
    }

    cargarReportes() {
        this.cargando = true;
        this.errorCarga = null;
        this.reportesService.listarPorUsuario().subscribe({
            next: (data) => {
                this.reportes = [...data].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                this.cargando = false;
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error al cargar los reportes', error);
                this.errorCarga = 'No pudimos cargar tus reportes. Revisá tu conexión e intentá nuevamente.';
                this.cargando = false;
                this.cdr.markForCheck();
            }
        });
    }

    async abrirDetalle(reporte: ReporteUsuario) {
        const modal = await this.modalController.create({
            component: DetalleReportePage,
            componentProps: { reporte }
        });
        await modal.present();
        const { data } = await modal.onDidDismiss();
        if (data?.eliminado) {
            this.cargarReportes();
        }
    }

    textoEstado(reporte: ReporteUsuario): string {
        if (reporte.estadoModeracion === 'rechazado') return 'Rechazado';
        if (reporte.estadoVecinal === 'cerrado') return 'Cerrado';
        if (reporte.estadoVecinal === 'confirmado') return 'Confirmado por vecinos';
        if (reporte.fotos?.length && reporte.estadoModeracion === 'pendiente') return 'Fotos en moderación';
        return 'Activo en mapa';
    }

    claseBadge(reporte: ReporteUsuario): string {
        if (reporte.estadoModeracion === 'rechazado' || reporte.estadoVecinal === 'cerrado') return 'cerrado';
        if (reporte.estadoVecinal === 'confirmado') return 'confirmado';
        return 'pendiente';
    }
}
