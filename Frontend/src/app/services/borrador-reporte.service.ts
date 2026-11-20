import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Report } from '../models/reporte';

export const ReportCameraRecovery = registerPlugin<{
  pending(): Promise<{ pending: boolean; uri?: string }>;
  clear(): Promise<void>;
  uploadResult(result: { status: number; durationMs: number }): Promise<void>;
}>('ReportCameraRecovery');

export async function leerArchivoFoto(foto: { uri?: string; webPath?: string; dataUrl?: string; thumbnail?: string }): Promise<Blob | null> {
  const url = foto.webPath || (foto.uri ? Capacitor.convertFileSrc(foto.uri) : foto.dataUrl);
  if (url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('No se pudo leer el archivo de la foto');
    return respuesta.blob();
  }
  if (foto.thumbnail) return (await fetch(`data:image/jpeg;base64,${foto.thumbnail}`)).blob();
  return null;
}

@Injectable({ providedIn: 'root' })
export class BorradorReporteService {
  private async abrir(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const solicitud = indexedDB.open('alertar-borrador-reporte', 1);
      solicitud.onupgradeneeded = () => solicitud.result.createObjectStore('borradores');
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  private async ejecutar<T>(modo: IDBTransactionMode, operacion: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.abrir();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaccion = db.transaction('borradores', modo);
        const solicitud = operacion(transaccion.objectStore('borradores'));
        transaccion.oncomplete = () => resolve(solicitud.result);
        transaccion.onerror = () => reject(transaccion.error);
        transaccion.onabort = () => reject(transaccion.error);
      });
    } finally { db.close(); }
  }

  guardar(reporte: Report): Promise<unknown> {
    return this.ejecutar('readwrite', store => store.put({ reporte, guardadoEn: Date.now(), usuario: localStorage.getItem('alertar_usuario') }, 'camara'));
  }

  async recuperar(): Promise<Report | null> {
    const entrada = await this.ejecutar('readonly', store => store.get('camara'));
    if (!entrada || entrada.usuario !== localStorage.getItem('alertar_usuario') || Date.now() - entrada.guardadoEn > 24 * 60 * 60 * 1000) return null;
    return entrada.reporte as Report;
  }

  async limpiar(): Promise<void> {
    await this.ejecutar('readwrite', store => store.delete('camara'));
    if (Capacitor.getPlatform() === 'android') await ReportCameraRecovery.clear();
  }
}
