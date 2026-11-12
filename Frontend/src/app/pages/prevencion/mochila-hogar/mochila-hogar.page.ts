import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonCheckbox, IonButton, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ItemMochila } from '../../../models/mochila.model';
import { arrowBackOutline, homeOutline } from 'ionicons/icons';
import { MochilaService } from '../../../services/mochila.service';

@Component({
  selector: 'app-mochila-hogar',
  templateUrl: './mochila-hogar.page.html',
  styleUrls: ['./mochila-hogar.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonIcon, IonCheckbox, IonButton],
  standalone: true
})
export class MochilaHogarPage implements OnInit {

  public checklist: ItemMochila[] = [];

  constructor(
    private location: Location, 
    private mochilaService: MochilaService,
    private toastController: ToastController
  ) {
    addIcons({ 'arrow-back-outline': arrowBackOutline, 'home-outline': homeOutline });
  }

  ngOnInit() {
    this.cargarChecklistHogar();
  }

  cargarChecklistHogar() {
    this.checklist = [
      { id: 1, titulo: 'Agua potable', subtitulo: 'Mínimo 2 litros por persona por día (reserva para 72 horas)', completado: false },
      { id: 2, titulo: 'Alimentos no perecederos', subtitulo: 'Enlatados, pastas secas y alimentos de larga duración', completado: false },
      { id: 3, titulo: 'Botiquín de primeros auxilios', subtitulo: 'Insumos esenciales de salud, gasas y elementos de curación', completado: false },
      { id: 4, titulo: 'Linterna y radio a pilas', subtitulo: 'Con pilas de repuesto para alertas oficiales', completado: false },
      { id: 5, titulo: 'Herramientas del hogar', subtitulo: 'Pinzas o llave francesa para corte preventivo de servicios', completado: false },
      { id: 6, titulo: 'Documentación de la vivienda', subtitulo: 'Escrituras y papeles importantes en bolsa hermética', completado: false },
      { id: 7, titulo: 'Silbato de emergencia', subtitulo: 'Para señales de localización o rescate', completado: false },
      { id: 8, titulo: 'Fósforos y velas', subtitulo: 'En recipientes impermeables para iluminación', completado: false },
      { id: 9, titulo: 'Artículos de higiene y limpieza', subtitulo: 'Lavandina para purificar agua, jabón y papel higiénico', completado: false },
      { id: 10, titulo: 'Llaves de repuesto y efectivo', subtitulo: 'Duplicados de llaves y dinero en efectivo de emergencia', completado: false }
    ];
  }

  get porcentaje(): number {
    const completados = this.checklist.filter(item => item.completado).length;
    if (this.checklist.length === 0) return 0;
    return Math.round((completados / this.checklist.length) * 100);
  }

  volver() {
    this.location.back();
  }

  async guardarProgreso() {
    const idsCompletados = this.checklist.filter(item => item.completado).map(item => item.id);
    const porcentajeActual = this.porcentaje;

    this.mochilaService.guardarProgreso('hogar', idsCompletados).subscribe({
      next: (res) => console.log('Progreso de hogar guardado', res),
      error: (err) => console.error('Error al guardar hogar', err)
    });

    const toast = await this.toastController.create({
      message: `Tu kit de emergencia del hogar se ha guardado (${porcentajeActual}% completado).`,
      duration: 3500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();

    this.location.back();
  }
}