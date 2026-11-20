import { Component, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { MapaComponent } from '../components/mapa/mapa.component';

@Component({
  selector: 'app-mapa-test',
  templateUrl: './mapa-test.page.html',
  styleUrls: ['./mapa-test.page.scss'],
  imports: [IonContent, MapaComponent]
})
export class MapaTestPage {
  readonly mostrarMapa = signal(true);

  ionViewWillEnter(): void { this.mostrarMapa.set(true); }

  // Ionic caches this page; destroy the map to release its WebGL context and timer.
  ionViewDidLeave(): void { this.mostrarMapa.set(false); }
}
