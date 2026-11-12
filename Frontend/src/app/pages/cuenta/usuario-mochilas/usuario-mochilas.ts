import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, briefcaseOutline, addCircleOutline } from 'ionicons/icons';

@Component({
    selector: 'app-usuario-mochilas',
    templateUrl: './usuario-mochilas.html',
    styleUrl: './usuario-mochilas.scss', 
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
export class UsuarioMochilasPage implements OnInit {

    // Controla si el usuario tiene al menos una mochila creada o progreso guardado
    public tieneMochilas: boolean = false;

    // Porcentajes dinámicos de cada mochila (puedes ajustarlos o leerlos del almacenamiento local si gustas)
    public porcentajeIndividual: number = 0;
    public porcentajeHogar: number = 0;
    public porcentajeFamiliar: number = 0;
    public porcentajeMascotas: number = 0;

    constructor(private location: Location) {
        addIcons({ arrowBackOutline, chevronForwardOutline, briefcaseOutline, addCircleOutline });
    }

    ngOnInit() {
        this.cargarEstadoMochilas();
    }

    cargarEstadoMochilas() {
        // Verificamos si hay algún indicador o datos guardados en el localStorage
        // (Por ejemplo, si el usuario ya guardó progreso en alguna de las mochilas)
        const ind = localStorage.getItem('progreso_individual');
        const hog = localStorage.getItem('progreso_hogar');
        const fam = localStorage.getItem('progreso_familiar');
        const mas = localStorage.getItem('progreso_mascotas');

        // Si al menos una tiene datos, pasamos `tieneMochilas` a true
        if (ind || hog || fam || mas) {
            this.tieneMochilas = true;
            this.porcentajeIndividual = ind ? Number(ind) : 0;
            this.porcentajeHogar = hog ? Number(hog) : 0;
            this.porcentajeFamiliar = fam ? Number(fam) : 0;
            this.porcentajeMascotas = mas ? Number(mas) : 0;
        } else {
            // Para pruebas iniciales, si querés forzar que se vea el listado y simular porcentajes, 
            // podés cambiar esto temporalmente a true. De lo contrario, arranca en false (estado vacío).
            this.tieneMochilas = false;
        }
    }

    volver() {
        this.location.back();
    }
}