import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'inicio/recomendaciones',
    loadComponent: () => import('./pages/inicio/recomendaciones/recomendaciones.page').then((m) => m.RecomendacionesPage),
  },
  {
    path: 'inicio/recomendaciones/:id',
    loadComponent: () => import('./pages/inicio/recomendaciones/detalle/detalle-recomendacion.page').then((m) => m.DetalleRecomendacionPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];