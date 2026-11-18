import { Component, OnInit } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonTitle, IonToolbar } from '@ionic/angular';
import { imageOutline, arrowBackOutline } from 'ionicons/icons';
import { cameraOutline } from 'ionicons/icons'
import { addIcons } from 'ionicons';
import { Camera } from '@capacitor/camera'
import { __metadata } from 'tslib';
import { ModalController } from '@ionic/angular';
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
    try {
      const result = await Camera.takePhoto({
        quality: 90,
        includeMetadata: true,
      });
      if (this.fotos.length < 3) {
        const blob = await this.obtenerBlobDeFoto(result);
        if (blob) {
          this.fotos.push(blob);
          await this.modalController.dismiss(this.fotos);
        }
      }
    } catch (a) {
      const error = a as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('takePhoto failed:', message);
    }
  }

  async selecfoto(fileInput?: HTMLInputElement) {
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
          if (blob) {
            this.fotos.push(blob);
          }
        }
      }
      await this.modalController.dismiss(this.fotos);
    } catch (e) {
      console.warn('chooseFromGallery falló, usando selector de archivos web:', e);
      if (fileInput) {
        fileInput.click();
      }
    }
  }

  async onArchivosSeleccionados(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    for (let i = 0; i < input.files.length; i++) {
      if (this.fotos.length < 3) {
        this.fotos.push(input.files[i]);
      }
    }
    await this.modalController.dismiss(this.fotos);
  }

  async obtenerBlobDeFoto(foto: any): Promise<Blob | null> {
    try {
      if (foto.webPath) {
        const res = await fetch(foto.webPath);
        return await res.blob();
      }
      if (foto.thumbnail) {
        return await this.base64blob(foto.thumbnail);
      }
      if (foto.dataUrl) {
        const res = await fetch(foto.dataUrl);
        return await res.blob();
      }
      return null;
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
