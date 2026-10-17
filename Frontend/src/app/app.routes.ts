import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { SesionService } from './services/sesion.service';
import { soloConSesion } from './guards/sesion.guard';

const arranque = () => (inject(SesionService).logueado() ? '/inicio' : '/acceso');

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: arranque,
  },

  {
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
    path: 'mapa',
    canActivate: [soloConSesion],
    loadComponent: () => import('./mapa-test/mapa-test.page').then(m => m.MapaTestPage),
  },
  {
    path: 'reportar',
    canActivate: [soloConSesion],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'prevencion',
    redirectTo: 'prevencion/mochila',
    pathMatch: 'full',
  },
  {
    path: 'prevencion/mochila',
    canActivate: [soloConSesion],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'prevencion/recomendaciones',
    canActivate: [soloConSesion],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'cuenta',
    canActivate: [soloConSesion],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },

  {
    path: '**',
    redirectTo: arranque,
  },
];