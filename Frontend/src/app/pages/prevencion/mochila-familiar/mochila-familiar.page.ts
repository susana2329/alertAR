import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonCheckbox, IonButton, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ItemMochila } from '../../../models/mochila.model';
import { arrowBackOutline, peopleOutline } from 'ionicons/icons';
import { MochilaService } from '../../../services/mochila.service';

@Component({
  selector: 'app-mochila-familiar',
  templateUrl: './mochila-familiar.page.html',
  styleUrls: ['./mochila-familiar.page.scss'],
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonIcon, 
    IonCheckbox, 
    IonButton
]
})
export class MochilaFamiliarPage {

  public mostrandoConfiguracion: boolean = true;
  public configFamiliar = {
    cantidadIntegrantes: 2,
    adultosMayores: false,
    discapacidad: false
  };

  public checklist: ItemMochila[] = [];

  constructor(
    private location: Location, 
    private mochilaService: MochilaService,
    private toastController: ToastController
    ) {
    addIcons({ 'arrow-back-outline': arrowBackOutline, 'people-outline': peopleOutline });
  }

  volver() {
    if (!this.mostrandoConfiguracion) {
      this.mostrandoConfiguracion = true;
    } else {
      this.location.back();
    }
  }

  generarChecklist() {
    let idCounter = 1;
    const nuevosItems: ItemMochila[] = [];
    const n = this.configFamiliar.cantidadIntegrantes > 0 ? this.configFamiliar.cantidadIntegrantes : 1;
    const litrosTotales = n * 2 * 3; 
    nuevosItems.push({
      id: idCounter++,
      titulo: 'Agua potable',
      subtitulo: `Mínimo 2L por persona por día (${litrosTotales} litros en total para 3 días para los ${n} integrantes)`,
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Alimentos no perecederos',
      subtitulo: `Para al menos 72 horas (enlatados, galletitas, barritas de cereal) para los ${n} integrantes`,
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Botiquín de primeros auxilios',
      subtitulo: 'Alcohol etílico, gasas, curitas y elementos básicos',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Linterna',
      subtitulo: 'Con pilas de refuerzo',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Ropa, abrigo y mantas',
      subtitulo: 'Según la temporada para el grupo familiar',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Documentos importantes',
      subtitulo: 'En bolsa aislante y hermética para que no se mojen',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Silbato',
      subtitulo: 'Para pedir ayuda en caso de rescate',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Fósforos y velas',
      subtitulo: 'Para iluminación y encendido de emergencia',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Libreta con teléfonos útiles',
      subtitulo: 'Bomberos, policía y emergencias del grupo familiar',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Artículos de higiene',
      subtitulo: 'Alcohol en gel, papel higiénico y jabón',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Dinero en efectivo',
      subtitulo: 'Efectivo para emergencias',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Medicamentos recetados',
      subtitulo: 'Dosis necesarias para emergencias',
      completado: false
    });

    nuevosItems.push({
      id: idCounter++,
      titulo: 'Llaves extra',
      subtitulo: 'De la casa y vehículos',
      completado: false
    });

    if (this.configFamiliar.adultosMayores) {
      nuevosItems.push({
        id: idCounter++,
        titulo: 'Soportes y medicación de adultos mayores',
        subtitulo: 'Bastones, andadores, duplicado de recetas y provisión de medicamentos crónicos',
        completado: false
      });
    }

    if (this.configFamiliar.discapacidad) {
      nuevosItems.push({
        id: idCounter++,
        titulo: 'Dispositivos de asistencia y soporte vital',
        subtitulo: 'Audífonos, pilas de repuesto, bastón blanco o elementos específicos',
        completado: false
      });
    }

    this.checklist = nuevosItems;
    this.mostrandoConfiguracion = false;
  }

  get porcentaje(): number {
    const elementosCompletados = this.checklist.filter(item => item.completado).length;
    if (this.checklist.length === 0) return 0;
    return Math.round((elementosCompletados / this.checklist.length) * 100);
  }

  guardarProgreso() {
    const idsCompletados = this.checklist.filter(item => item.completado).map(item => item.id);
    this.mochilaService.guardarProgreso('familiar', idsCompletados).subscribe({
      next: (res) => console.log('Guardado exitoso', res),
      error: (err) => console.error('Error', err)
    });
  }
}