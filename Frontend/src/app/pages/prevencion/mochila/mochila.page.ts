import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonContent, IonHeader, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mochila',
  templateUrl: './mochila.page.html',
  styleUrls: ['./mochila.page.scss'],
  imports: [CommonModule, IonContent, IonHeader, IonButton, IonIcon],
})
export class MochilaPage {
  public categorias = [
    {
      nombre: 'Individual',
      descripcion: 'Para vos',
      color: '#A9B8C9',
      icono: 'assets/icon/individual.png',
      ruta: '/prevencion/mochila-individual' 
    },
    {
      nombre: 'Familiar',
      descripcion: 'Para tu familia',
      color: '#A8D5A8',
      icono: 'assets/icon/familiar.png',
      ruta: '/prevencion/mochila-familiar' 
    },
    {
      nombre: 'Mascotas',
      descripcion: 'Para tus compañeros',
      color: '#F3F3B5',
      icono: 'assets/icon/mascotas.png',
      ruta: '/prevencion/mochila-mascotas'
    },
    {
      nombre: 'Hogar',
      descripcion: 'Para tu casa',
      color: '#F9A8F9',
      icono: 'assets/icon/casita.png',
      ruta: '/prevencion/mochila-hogar' 
    },
  ];

  constructor(private location: Location, private router: Router) {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
    });
  }

  volver() {
    this.location.back();
  }

  irACategoria(categoria: any) {
    if (categoria.ruta) {
      this.router.navigate([categoria.ruta]);
    } else {
      console.log('Página en construcción');
    }
  }
}