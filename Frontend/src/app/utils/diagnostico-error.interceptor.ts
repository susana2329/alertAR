import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { diagnosticarError } from './diagnostico-error';

export const diagnosticoErrorInterceptor: HttpInterceptorFn = (request, next) => next(request).pipe(
  catchError(error => {
    console.error('[HTTP]', diagnosticarError(error, request.urlWithParams));
    return throwError(() => error);
  })
);
