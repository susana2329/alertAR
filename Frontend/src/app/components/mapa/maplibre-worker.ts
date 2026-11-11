import { getWorkerUrl, setWorkerUrl } from 'maplibre-gl';

const WORKER_ASSET = 'assets/maplibre/maplibre-gl-worker.mjs';

export function construirUrlWorkerMapLibre(baseURI: string): string {
  return new URL(WORKER_ASSET, baseURI).href;
}

export function configurarWorkerMapLibre(baseURI: string): string {
  setWorkerUrl(construirUrlWorkerMapLibre(baseURI));
  return getWorkerUrl();
}
