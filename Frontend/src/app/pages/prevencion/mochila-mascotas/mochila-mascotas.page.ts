import { Component, ChangeDetectorRef  } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonCheckbox, IonButton, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { ItemMochila } from '../../../models/mochila.model';
import { MochilaService } from '../../../services/mochila.service';

@Component({
  selector: 'app-mochila-mascotas',
  templateUrl: './mochila-mascotas.page.html',
  styleUrls: ['./mochila-mascotas.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonIcon, IonCheckbox, IonButton],
  standalone: true
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

  constructor(private location: Location, private toastController: ToastController, private mochilaService: MochilaService, private cdr: ChangeDetectorRef ) {
    addIcons({ 'arrow-back-outline': arrowBackOutline });
  }

  ionViewWillEnter() {
    this.mochilaService.obtenerProgreso('mascotas').subscribe({
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

    this.mochilaService.guardarProgreso('mascotas', idsCompletados).subscribe({
      next: (res) => console.log('Guardado de mascotas exitoso', res),
      error: (err) => console.error('Error al guardar mascotas', err)
    });

    const toast = await this.toastController.create({
      message: `El kit de tu mascota se ha guardado (${porcentajeActual}% completado).`,
      duration: 3500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();

    this.location.back();
  }
}