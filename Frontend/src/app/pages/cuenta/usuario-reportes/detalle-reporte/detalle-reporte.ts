import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, locationOutline, checkmarkCircleOutline, timeOutline } from 'ionicons/icons';

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

    @Input() reporte: any;

    constructor(private modalController: ModalController) {
        addIcons({ 
            closeOutline, 
            calendarOutline, 
            locationOutline,
            checkmarkCircleOutline,
            timeOutline
        });
    }

    cerrar() {
        this.modalController.dismiss();
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