import { Component, OnInit } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonTitle } from '@ionic/angular';
import { imageOutline } from 'ionicons/icons';
import { cameraOutline } from 'ionicons/icons'
import { addIcons } from 'ionicons';
import { Camera } from '@capacitor/camera'
@Component({
  selector: 'app-modal-photos',
  templateUrl: './modal-photos.component.html',
  styleUrls: ['./modal-photos.component.scss'],
  imports: [IonContent, IonButton, IonIcon, IonHeader, IonItem, IonLabel],
})
export class ModalPhotosComponent implements OnInit {

  constructor() {
    addIcons({
      'image-outline': imageOutline,
      'camera-outline': cameraOutline
    })
  }
  ngOnInit() { }

  async tomarfoto() {
    try {
      const result = await Camera.takePhoto({
        quality: 90,
        includeMetadata: true,
      })
    }
    catch{

    }
    
   }

}
