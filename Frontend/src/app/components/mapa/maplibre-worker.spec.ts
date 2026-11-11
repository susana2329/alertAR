import { configurarWorkerMapLibre } from './maplibre-worker';

describe('URL del worker de MapLibre', () => {
  it('entrega a MapLibre una URL string same-origin del asset .mjs', () => {
    const url = configurarWorkerMapLibre('https://localhost/');

    expect(typeof url).toBe('string');
    expect(url).toBe('https://localhost/assets/maplibre/maplibre-gl-worker.mjs');
    expect(url.endsWith('.mjs')).toBe(true);
  });
});
