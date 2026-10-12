import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { MapaComponent } from '../components/mapa/mapa.component';

@Component({
  selector: 'app-mapa-test',
  templateUrl: './mapa-test.page.html',
  styleUrls: ['./mapa-test.page.scss'],
  imports: [IonContent, MapaComponent]
})
export class MapaTestPage {}