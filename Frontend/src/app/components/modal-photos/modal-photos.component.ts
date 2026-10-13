import { Component, Output, OnInit, EventEmitter } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel } from '@ionic/angular';
import { imageOutline, options } from 'ionicons/icons';
import { cameraOutline } from 'ionicons/icons'
import { addIcons } from 'ionicons';
import { Camera } from '@capacitor/camera'
import { __metadata } from 'tslib';
@Component({
  selector: 'app-modal-photos',
  templateUrl: './modal-photos.component.html',
  styleUrls: ['./modal-photos.component.scss'],
  imports: [IonContent, IonButton, IonIcon, IonHeader, IonItem, IonLabel],
})
export class ModalPhotosComponent implements OnInit {
  public fotos: object[] = []
  @Output() fotosguardadas = new EventEmitter<object[]>()
  constructor() {
    addIcons({
      'image-outline': imageOutline,
      'camera-outline': cameraOutline
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
        this.fotos.push(result)
        console.log(result)
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
      for (const item of results) {
        if (this.fotos.length < 3) {
          this.fotos.push(item)
        }
        else {
          console.log("Solo se puede subir 3 fotoss")
          break
        }
      }

    } catch (e) {
      const error = e as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('chooseFromGallery failed:', message);
    }
  }
  enviar() {
    this.fotosguardadas.emit([{
      prueba: "osdaaodsoads"
    }])
  }

}
