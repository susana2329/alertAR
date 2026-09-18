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
];
