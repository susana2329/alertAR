import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'acceso',
    pathMatch: 'full',
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
    path: 'acceso',
    loadComponent: () => import('./pages/acceso/antes-login/antes-login').then(m => m.AntesLoginPage),
  },
  {
    path: 'acceso/flip',
    loadComponent: () => import('./pages/acceso/acceso-flip/acceso-flip.page').then(m => m.AccesoFlipPage),
  },
  {
    path: 'acceso/permisos-ubicacion',
    loadComponent: () => import('./pages/acceso/permisos-ubicacion/permisos-ubicacion.page').then(m => m.PermisosUbicacionPage),
  },

  {
    path: 'inicio',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'mapa',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'reportar',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'prevencion',
    redirectTo: 'prevencion/mochila',
    pathMatch: 'full',
  },
  {
    path: 'prevencion/mochila',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'prevencion/recomendaciones',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },

  {
    path: '**',
    redirectTo: 'acceso',
  },
];