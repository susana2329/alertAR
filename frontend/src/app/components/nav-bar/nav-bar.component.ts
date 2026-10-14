import { Component, computed, effect, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { NavController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, mapOutline, addCircleOutline, shieldCheckmarkOutline, personOutline, chevronUp, bagHandleOutline, bulbOutline } from 'ionicons/icons';

addIcons({ homeOutline, mapOutline, addCircleOutline, shieldCheckmarkOutline, personOutline, chevronUp, bagHandleOutline, bulbOutline });

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent {

  diseno = 'circulo';

  tabs = [
    { nombre: 'Inicio', ruta: '/inicio', icono: 'home-outline', conMenu: false },
    { nombre: 'Mapa', ruta: '/mapa-test', icono: 'map-outline', conMenu: false },
    { nombre: 'Reportar', ruta: '/reportar', icono: 'add-circle-outline', conMenu: false },
    { nombre: 'Prevencion', ruta: '/prevencion', icono: 'shield-checkmark-outline', conMenu: true },
    { nombre: 'Cuenta', ruta: '/cuenta', icono: 'person-outline', conMenu: false }
  ];
  opcionesPrevencion = [
    { nombre: 'Mi mochila', ruta: '/prevencion/mochila', icono: 'bag-handle-outline' },
    { nombre: 'Recomendaciones', ruta: '/prevencion/recomendaciones', icono: 'bulb-outline' }
  ];

  url = signal('');
  menuAbierto = signal(false);

  indice = computed(() => this.tabs.findIndex(tab => this.url().startsWith(tab.ruta)));
  visible = computed(() => this.indice() !== -1);

  constructor(private router: Router, private navCtrl: NavController) {
    this.url.set(this.router.url);

    this.router.events.subscribe(evento => {
      if (evento instanceof NavigationEnd) {
        this.url.set(evento.urlAfterRedirects);
        this.menuAbierto.set(false);
      }
    });

    effect(() => {
      document.body.classList.toggle('con-barra', this.visible());
    });
  }

  tocarTab(tab: { ruta: string; conMenu: boolean }) {
    if (tab.conMenu) {
      this.menuAbierto.update(abierto => !abierto);
      return;
    }
    this.menuAbierto.set(false);
    this.navCtrl.navigateRoot(tab.ruta, { animated: false });
  }

  irAOpcion(ruta: string) {
    this.menuAbierto.set(false);
    this.navCtrl.navigateRoot(ruta, { animated: false });
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

}