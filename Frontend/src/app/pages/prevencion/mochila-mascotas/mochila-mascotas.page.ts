import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonCheckbox, IonButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { ItemMochila } from '../../../models/mochila.model';
import { MochilaService } from '../../../services/mochila.service';

@Component({
  selector: 'app-mochila-mascotas',
  templateUrl: './mochila-mascotas.page.html',
  styleUrls: ['./mochila-mascotas.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonIcon, IonCheckbox, IonButton]
})
export class MochilaMascotasPage {
  
  public checklist: ItemMochila[]  = [
    { id: 1, titulo: 'Alimento habitual', subtitulo: 'Porciones para la emergencia', completado: false },
    { id: 2, titulo: 'Agua', subtitulo: 'Agua potable para el traslado', completado: false },
    { id: 3, titulo: 'Recipientes', subtitulo: 'Para agua y alimento', completado: false },
    { id: 4, titulo: 'Identificación', subtitulo: 'Chapita con nombre y teléfono', completado: false },
    { id: 5, titulo: 'Documentación sanitaria', subtitulo: 'Credencial de vacunación actualizada', completado: false },
    { id: 6, titulo: 'Contacto veterinario', subtitulo: 'Teléfono de tu veterinario', completado: false },
    { id: 7, titulo: 'Correa y collar', subtitulo: 'Para trasladar perros de forma segura', completado: false },
    { id: 8, titulo: 'Transportadora', subtitulo: 'Para trasladar gatos de forma segura', completado: false },
    { id: 9, titulo: 'Manta', subtitulo: 'Para acompañar el traslado', completado: false },
    { id: 10, titulo: 'Lugar de resguardo', subtitulo: 'Familiar, conocido o refugio previsto', completado: false }
  ];

  constructor(private location: Location) {
    addIcons({ 'arrow-back-outline': arrowBackOutline });
  }

  volver() {
    this.location.back();
  }

  get porcentaje(): number {
    const elementosCompletados = this.checklist.filter(item => item.completado).length;
    if (this.checklist.length === 0) return 0;
    return Math.round((elementosCompletados / this.checklist.length) * 100);
  }

  guardarProgreso() {
    console.log('Progreso Mascotas a guardar:', this.checklist);
// se me pasa la alergia y sigo con la conexion axa
  }
}