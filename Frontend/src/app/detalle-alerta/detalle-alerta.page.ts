import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { ALERTAS_MOCK } from '../mocks/alertas.mock';
import { Alerta } from '../models/alerta.model';

@Component({
  selector: 'app-detalle-alerta',
  templateUrl: './detalle-alerta.page.html',
  styleUrls: ['./detalle-alerta.page.scss'],
  imports: [IonContent]
})
export class DetalleAlertaPage implements OnInit {

  alerta?: Alerta;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.alerta = ALERTAS_MOCK.find(
      (alerta) => alerta.id === id
    );
  }

  volverAlMapa(): void {
    this.router.navigate(['/mapa-test']);
  }

}