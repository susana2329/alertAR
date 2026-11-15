import { Component, ChangeDetectorRef  } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonCheckbox, IonButton, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ItemMochila } from '../../../models/mochila.model';
import { arrowBackOutline, briefcaseOutline } from 'ionicons/icons';
import { MochilaService } from '../../../services/mochila.service';

@Component({
  selector: 'app-mochila-individual',
  templateUrl: './mochila-individual.page.html',
  styleUrls: ['./mochila-individual.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonIcon, IonCheckbox, IonButton]
})
export class MochilaIndividualPage {

  public checklist: ItemMochila[] = [
    { id: 1, titulo: 'Agua', subtitulo: 'Mínimo 2 litros', completado: false },
    { id: 2, titulo: 'Alimentos no perecederos', subtitulo: 'Para al menos 3 días (enlatados, galletitas, barra de chocolate)', completado: false },
    { id: 3, titulo: 'Botiquín de primeros auxilios', subtitulo: 'Elementos básicos (curitas, alcohol etílico, gasas)', completado: false },
    { id: 4, titulo: 'Linterna', subtitulo: 'Con pilas de refuerzo', completado: false },
    { id: 5, titulo: 'Ropa, Abrigo y mantas', subtitulo: 'Según la temporada', completado: false },
    { id: 6, titulo: 'Documentos importantes', subtitulo: 'En bolsa plástica hermética', completado: false },
    { id: 7, titulo: 'Silbato', subtitulo: 'Para pedir ayuda', completado: false },
    { id: 8, titulo: 'Fósforos y velas', subtitulo: 'Para prender una fogata', completado: false },
    { id: 9, titulo: 'Libretas con teléfonos útiles', subtitulo: 'Bomberos, policía, emergencias', completado: false },
    { id: 10, titulo: 'Artículos de higiene', subtitulo: 'Alcohol en gel, papel higiénico', completado: false },
    { id: 11, titulo: 'Dinero', subtitulo: 'Efectivo para emergencias', completado: false },
    { id: 12, titulo: 'Medicamentos recetados', subtitulo: 'Dosis para emergencias', completado: false },
    { id: 13, titulo: 'Llaves extra', subtitulo: 'De la casa y el vehículo', completado: false }
  ];


  constructor(private location: Location, private mochilaService: MochilaService, private toastController: ToastController, private cdr: ChangeDetectorRef) {
    addIcons({ 'arrow-back-outline': arrowBackOutline, 'briefcase-outline': briefcaseOutline });
  }

  ionViewWillEnter() {
    this.mochilaService.obtenerProgreso('individual').subscribe({
      next: (ids) => {
        this.checklist.forEach(item => item.completado = ids.includes(item.id));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('No se pudo cargar el progreso', err)
    });
  }

  volver() {
    this.location.back();
  }

  get porcentaje(): number {
    const elementosCompletados = this.checklist.filter(item => item.completado).length;
    if (this.checklist.length === 0) return 0;
    return Math.round((elementosCompletados / this.checklist.length) * 100);
  }

async guardarProgreso() {
    const idsCompletados = this.checklist.filter(item => item.completado).map(item => item.id);
    const porcentajeActual = this.porcentaje;

    this.mochilaService.guardarProgreso('individual', idsCompletados).subscribe({
      next: (res) => console.log('Guardado de mochila exitoso', res),
      error: (err) => console.error('Error al guardar la mochila individual', err)
    });

    const toast = await this.toastController.create({
      message: `Tu mochila individual se guardó (${porcentajeActual}% completado).`,
      duration: 3500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();

    this.location.back();
  }
}