import { HttpErrorResponse } from '@angular/common/http';
import { diagnosticarError } from './diagnostico-error';

describe('diagnosticarError', () => {
  it('registra código, URL y detalle HTTP sin filtrar tokens ni credenciales', () => {
    const error = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      url: 'http://localhost/api/recurso?access_token=abc123&id=9',
      error: { mensaje: 'Acceso denegado', password: 'secreto', detalle: { authorization: 'Bearer xyz' } }
    });

    expect(diagnosticarError(error)).toEqual({
      tipo: 'HttpErrorResponse',
      mensaje: 'Forbidden',
      codigoHttp: 403,
      url: 'http://localhost/api/recurso?access_token=%5Bredacted%5D&id=9',
      detalle: { mensaje: 'Acceso denegado', password: '[redacted]', detalle: { authorization: '[redacted]' } }
    });
  });

  it('describe excepciones JavaScript sin serializarlas como [object Object]', () => {
    expect(diagnosticarError(new TypeError('No se pudo inicializar MapLibre'))).toEqual({
      tipo: 'TypeError', mensaje: 'No se pudo inicializar MapLibre'
    });
  });
});
