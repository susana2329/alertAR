import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, briefcaseOutline, addCircleOutline } from 'ionicons/icons';
import { MochilaService } from '../../../services/mochila.service';

interface TarjetaMochila {
    clave: string;
    titulo: string;
    ruta: string;
    completados: number;
    total: number | null;
    porcentaje: number | null;
}

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
export class UsuarioMochilasPage {

    public cargando: boolean = true;
    public mochilas: TarjetaMochila[] = [];

    private readonly definiciones = [
        { clave: 'individual', titulo: 'Mochila Individual', ruta: '/prevencion/mochila-individual', total: 13 },
        { clave: 'familiar', titulo: 'Mochila Familiar', ruta: '/prevencion/mochila-familiar', total: null },
        { clave: 'hogar', titulo: 'Kit del Hogar', ruta: '/prevencion/mochila-hogar', total: 10 },
        { clave: 'mascotas', titulo: 'Mochila de Mascotas', ruta: '/prevencion/mochila-mascotas', total: 10 }
    ];

    constructor(
        private location: Location,
        private mochilaService: MochilaService,
        private cdr: ChangeDetectorRef
    ) {
        addIcons({ arrowBackOutline, chevronForwardOutline, briefcaseOutline, addCircleOutline });
    }

    get tieneMochilas(): boolean {
        return this.mochilas.length > 0;
    }

    ionViewWillEnter() {
        this.cargarEstadoMochilas();
    }

    cargarEstadoMochilas() {
        this.mochilaService.obtenerMochilas().subscribe({
            next: (data) => {
                const doc = Array.isArray(data) ? data[0] : data;

                this.mochilas = this.definiciones
                    .map(d => {
                        const completados = this.contar(doc?.[d.clave]);
                        return {
                            ...d,
                            completados,
                            porcentaje: this.calcular(completados, d.total)
                        };
                    })
                    .filter(m => m.completados > 0);

                this.cargando = false;
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error al cargar las mochilas', error);
                this.cargando = false;
                this.cdr.markForCheck();
            }
        });
    }

    private contar(valor: any): number {
        if (Array.isArray(valor)) return valor.length;
        if (valor && typeof valor === 'object') {
            return Object.values(valor).reduce(
                (total: number, v: any) => total + (Array.isArray(v) ? v.length : 0), 0
            );
        }
        return 0;
    }

    private calcular(completados: number, total: number | null): number | null {
        if (!total) return null;
        return Math.min(100, Math.round((completados / total) * 100));
    }

    volver() {
        this.location.back();
    }
}