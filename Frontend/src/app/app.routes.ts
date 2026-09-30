import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'mapa-test',
    loadComponent: () => import('./mapa-test/mapa-test.page').then( m => m.MapaTestPage)
  },
  {
  path: 'detalle-alerta/:id',
  loadComponent: () =>
    import('./detalle-alerta/detalle-alerta.page').then(
      m => m.DetalleAlertaPage
    )
},
];
