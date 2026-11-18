import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionService } from '../services/sesion.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.obtenerToken();

  let peticion = req;
  // Si tenemos un token y la petición no tiene ya cabecera Authorization
  if (token && !req.headers.has('Authorization')) {
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Evitar bucle si el 401 proviene del intento de login o registro
        if (!req.url.includes('/auth/login') && !req.url.includes('/auth/registro')) {
          sesion.cerrarSesion();
          router.navigate(['/acceso/flip']);
        }
      }
      return throwError(() => error);
    })
  );
};
