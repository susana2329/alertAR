import { Component, OnInit } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonTitle, IonToolbar } from '@ionic/angular';
import { imageOutline, arrowBackOutline } from 'ionicons/icons';
import { cameraOutline } from 'ionicons/icons'
import { addIcons } from 'ionicons';
import { Camera } from '@capacitor/camera'
import { __metadata } from 'tslib';
import { ModalController } from '@ionic/angular';
import { leerArchivoFoto } from '../../services/borrador-reporte.service';
@Component({
  selector: 'app-modal-photos',
  templateUrl: './modal-photos.component.html',
  styleUrls: ['./modal-photos.component.scss'],
  imports: [IonContent, IonButton, IonIcon, IonHeader, IonItem, IonLabel,IonToolbar,IonTitle],
})
export class ModalPhotosComponent implements OnInit {
  public fotos: Blob[] = []
  public imagen?: string = ""
  public blob?: Blob
  public url?: string
  public errorFoto = ''
  constructor(private modalController: ModalController) {
    addIcons({
      'image-outline': imageOutline,
      'camera-outline': cameraOutline,
      'arrow-back-outline': arrowBackOutline
    })
  }
  ngOnInit() {

  }

  async tomarfoto() {
    this.errorFoto = '';
    try {
      const result = await Camera.takePhoto({
        quality: 80,
        targetWidth: 1600,
        targetHeight: 1600,
        includeMetadata: true,
      });
      if (this.fotos.length < 3) {
        const blob = await this.obtenerBlobDeFoto(result);
        if (blob?.size) {
          this.fotos.push(blob);
          await this.modalController.dismiss(this.fotos);
        } else {
          this.errorFoto = 'No se pudo leer la foto. Probá de nuevo o seleccioná un archivo.';
        }
      }
    } catch (a) {
      const error = a as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('takePhoto failed:', message);
      this.errorFoto = 'No se pudo abrir la cámara. Probá seleccionar una foto.';
    }
  }

  async selecfoto(fileInput?: HTMLInputElement) {
    this.errorFoto = '';
    try {
      const { results } = await Camera.chooseFromGallery({
        allowMultipleSelection: true,
        limit: 3,
        includeMetadata: true,
      });
      if (!results || results.length === 0) {
        return;
      }
      for (const item of results) {
        if (this.fotos.length < 3) {
          const blob = await this.obtenerBlobDeFoto(item);
          if (blob?.size) {
            this.fotos.push(blob);
          }
        }
      }
      if (this.fotos.length) {
        await this.modalController.dismiss(this.fotos);
      } else {
        this.errorFoto = 'No se pudieron leer las fotos seleccionadas. Probá con otro archivo.';
      }
    } catch (e) {
      console.warn('chooseFromGallery falló, usando selector de archivos web:', e);
      if (fileInput) {
        fileInput.click();
      }
    }
  }

  async onArchivosSeleccionados(event: Event) {
    this.errorFoto = '';
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    for (let i = 0; i < input.files.length; i++) {
      if (this.fotos.length < 3 && input.files[i].size > 0) {
        this.fotos.push(input.files[i]);
      }
    }
    if (this.fotos.length) {
      await this.modalController.dismiss(this.fotos);
    } else {
      this.errorFoto = 'No se pudo leer la foto seleccionada. Probá con otro archivo.';
    }
  }

  async obtenerBlobDeFoto(foto: any): Promise<Blob | null> {
    try {
      return await leerArchivoFoto(foto);
    } catch {
      return null;
    }
  }

  async base64blob(data: string): Promise<Blob> {
    const res = await fetch(`data:image/jpeg;base64,${data}`);
    this.blob = await res.blob();
    return this.blob;
  }
}
