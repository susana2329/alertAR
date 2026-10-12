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

  // Diseño de la barra, probá cambiando esta palabra: 'circulo' | 'flotante' | 'luz'
  diseno = 'circulo';

  tabs = [
    { nombre: 'Inicio', ruta: '/inicio', icono: 'home-outline', conMenu: false },
    { nombre: 'Mapa', ruta: '/mapa', icono: 'map-outline', conMenu: false },
    { nombre: 'Reportar', ruta: '/reportar', icono: 'add-circle-outline', conMenu: false },
    { nombre: 'Prevencion', ruta: '/prevencion', icono: 'shield-checkmark-outline', conMenu: true },
    { nombre: 'Cuenta', ruta: '/cuenta', icono: 'person-outline', conMenu: false }
  ];

  // Las dos opciones que se abren al tocar Prevencion
  opcionesPrevencion = [
    { nombre: 'Mi mochila', ruta: '/prevencion/mochila', icono: 'bag-handle-outline' },
    { nombre: 'Recomendaciones', ruta: '/prevencion/recomendaciones', icono: 'bulb-outline' }
  ];

  // Son signals porque cambian solos (al navegar), no por un click
  url = signal('');
  menuAbierto = signal(false);

  // Que tab esta activa (-1 = ninguna, o sea que estamos en una pantalla sin barra)
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

    // Cuando la barra se ve, las paginas dejan lugar abajo para que no las tape (ver global.scss)
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