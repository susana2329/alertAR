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
      })
      if (this.fotos.length < 3) {

        this.blob = await this.base64blob(result.thumbnail!)
        this.fotos.push(this.blob)
        await this.modalController.dismiss(this.fotos);
      }

      else {
        console.log("Solo se puede subir 3 fotoss")
      }

    }
    catch (a) {
      const error = a as any
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('takePhoto failed:', message);
    }
  }



  async selecfoto() {
    try {
      const { results } = await Camera.chooseFromGallery({
        allowMultipleSelection: true,
        limit: 3,
        includeMetadata: true,
      });
      if (results.length === 0) {
        console.info('No se seleccionó ninguna foto.')
        return
      }
      console.log("el resultado es",results)
      for (const item of results) {
        if (this.fotos.length < 3 ) {
          console.log(item)
          this.blob = await this.base64blob(item.thumbnail!)
          this.fotos.push(this.blob)
          console.log(this.fotos)
        }
        else {
          console.log("Solo se puede subir 3 fotoss")
          
        }
      }
      await this.modalController.dismiss(this.fotos)
      console.log("fotos",this.fotos)

    } catch (e) {
      const error = e as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('chooseFromGallery failed:', message);
    }
  }
  async base64blob(data: string) {
    const res = await fetch(`data:image/jpeg;base64,${data}`);
    this.blob = await res.blob();
    return this.blob
  }
}
