import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapaComponent } from './mapa.component';
import { AlertaService } from '../../services/alerta.service';

describe('MapaComponent', () => {
  let component: MapaComponent;
  let fixture: ComponentFixture<MapaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: AlertaService, useValue: { listar: () => ({ subscribe: () => undefined }) } }] });
    fixture = TestBed.createComponent(MapaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('omite ubicaciones ausentes o fuera de rango y conserva cada punto válido una sola vez', () => {
    component.alertas = [
      { id: 'a', titulo: 'A', tipo: 'nevada', nivel: 'desconocido', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria: null },
      { id: 'b', titulo: 'B', tipo: 'sismo', nivel: 'informativo', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria: null }
    ];
    const coleccion = (component as any).crearFeatureCollection();
    expect(coleccion.features).toHaveLength(1);
    expect(coleccion.features[0].geometry.coordinates).toEqual([-60, -35]);
    expect(coleccion.features[0].properties.nivel).toBe('informativo');
  });

  it('muestra magnitud y profundidad en el popup de sismos sin usar riesgo como identidad', () => {
    const alerta = {
      id: 'quake', titulo: 'Sismo', tipo: 'sismo', nivel: 'informativo',
      origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null,
      ubicacion: { latitud: -31, longitud: -68 }, geometria: null,
      detalle: { magnitud: 3.4, profundidad: 192 }
    };
    const popup = (component as any).construirResumenSismo(alerta, '#087f8c');

    expect(popup).toContain('pulse-outline');
    expect(popup).toContain('Magnitud');
    expect(popup).toContain('3,4');
    expect(popup).toContain('Profundidad');
    expect(popup).toContain('192 km');
    expect(popup).toContain('#087f8c');
  });

  it('contextualiza la clasificación del popup INA con valor y fecha de medición', () => {
    const alerta = {
      id: 'ina-1', titulo: 'Estación Río', fuente: 'INA', tipo: 'observacion', nivel: 'advertencia',
      origen: 'oficial', naturaleza: 'alerta', descripcion: 'La altura está en aumento. Medición: 4.25 m.',
      fechaInicio: '2026-10-23T12:00:00.000Z', fechaFin: null,
      ubicacion: { latitud: -35, longitud: -60 }, geometria: null,
      detalle: { medicion: { fecha: '2026-10-23T12:00:00.000Z', valor: 4.25, unidad: 'm' } }
    };
    const resumen = (component as any).construirResumenMedicionINA(alerta);

    expect(resumen).toContain('Medición INA');
    expect(resumen).toContain('4,25 m');
    expect(resumen).toContain('Registrada:');
    expect(resumen).toContain('2026');
    expect(resumen).not.toContain('undefined');
  });

  it('mantiene el color de clasificación INA en el marcador y el resumen del popup', () => {
    const alerta = {
      id: 'ina-alerta', titulo: 'Reconquista', fuente: 'INA', tipo: 'observacion', nivel: 'advertencia',
      origen: 'oficial', naturaleza: 'alerta', etiqueta: 'ALERTA', color: 'naranja', descripcion: '',
      fechaInicio: null, fechaFin: null, ubicacion: { latitud: -29, longitud: -59 }, geometria: null,
      detalle: { medicion: { valor: 5.2, unidad: 'm', fecha: '2026-10-28T12:00:00.000Z' } }
    };
    component.alertas = [alerta as any];
    const punto = (component as any).crearFeatureCollection().features[0];
    const color = (component as any).obtenerColorAlerta(alerta.nivel, alerta.color);

    expect(punto.properties.color).toBe('#f59e0b');
    expect(color).toBe('#f59e0b');
    expect((component as any).construirResumenMedicionINA(alerta)).toContain('5,2 m');
  });

  it('usa colores distintos para los cuatro niveles y mantiene desconocido en gris', () => {
    const color = (nivel: string) => (component as any).obtenerColorAlerta(nivel);
    expect(color('informativo')).toBe('#2878bd');
    expect(color('precaucion')).toBe('#f6c945');
    expect(color('advertencia')).toBe('#f59e0b');
    expect(color('emergencia')).toBe('#ef3b3b');
    expect(color('desconocido')).toBe('#64748b');

    component.alertas = [{
      id: 'incompleta', titulo: 'Dato insuficiente', tipo: 'observacion', nivel: 'desconocido',
      naturaleza: 'observacion', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null,
      ubicacion: { latitud: -35, longitud: -60 }, geometria: null
    }];
    const [feature] = (component as any).crearFeatureCollection().features;
    expect(feature.properties.nivel).toBe('desconocido');
    expect(feature.properties.color).toBe('#64748b');
  });

  it('construye insignias del popup con etiquetas y clases del nivel, sin llamar informativo a desconocido', () => {
    const etiqueta = (nivel: string, naturaleza: string, color?: string, etiquetaApi?: string) =>
      (component as any).construirEtiquetaClasificacion({ nivel, naturaleza, color, etiqueta: etiquetaApi });

    expect(etiqueta('informativo', 'observacion')).toContain('nivel--azul">INFORMATIVO');
    expect(etiqueta('precaucion', 'alerta')).toContain('nivel--amarillo">PRECAUCIÓN');
    expect(etiqueta('advertencia', 'alerta')).toContain('nivel--naranja">ALERTA');
    expect(etiqueta('emergencia', 'alerta')).toContain('nivel--rojo">EMERGENCIA');
    expect(etiqueta('desconocido', 'observacion', 'azul', 'ALERTA')).toContain('nivel--neutro">DESCONOCIDO');
  });

  it('acepta geometrías Polygon y MultiPolygon con coordenadas GeoJSON [longitud, latitud]', () => {
    const valida = (component as any).geometriaValida.bind(component);
    const polygon = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const multiPolygon = { type: 'MultiPolygon' as const, coordinates: [[[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]]] };
    expect(valida({ type: 'Point', coordinates: [-60, -35] })).toBe(true);
    expect(valida(polygon)).toBe(true);
    expect(valida(multiPolygon)).toBe(true);
    expect(valida({ type: 'Point', coordinates: [-200, -35] })).toBe(false);
    expect(valida({ type: 'Polygon', coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -34]]] })).toBe(false);

    for (const geometria of [polygon, multiPolygon]) {
      component.modoCobertura = true;
      (component as any).alertaPoligonoSeleccionada = {
        id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
        descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria
      };
      const featureCollection = (component as any).crearFeatureCollectionPoligono();
      expect(featureCollection.features).toHaveLength(1);
      expect(featureCollection.features[0].geometry).toEqual(geometria);
    }
  });

  it('no muestra polígonos en el mapa general y solo ofrece Ver cobertura para geometrías válidas', () => {
    const polygon = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const alertaPoligonal = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria: polygon
    };
    const marcadorOficial = {
      id: 'point-official', titulo: 'Punto oficial', tipo: 'tormenta', nivel: 'precaucion', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -34, longitud: -59 }, geometria: null
    };
    const marcadorVecinal = {
      ...marcadorOficial, id: 'point-neighbor', titulo: 'Punto vecinal', origen: 'vecinal',
      ubicacion: { latitud: -33, longitud: -58 }
    };
    component.alertas = [alertaPoligonal, marcadorOficial, marcadorVecinal] as any;
    (component as any).alertaPoligonoSeleccionada = alertaPoligonal;

    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(0);
    expect((component as any).crearAccionCoberturaPopup(alertaPoligonal)).toContain('Ver cobertura');
    expect((component as any).crearAccionCoberturaPopup({ ...alertaPoligonal, geometria: null })).toBe('');
    expect((component as any).crearAccionCoberturaPopup({
      ...alertaPoligonal,
      geometria: { type: 'Polygon', coordinates: [] }
    })).toBe('');
  });

  it('explora una cobertura, conserva el polígono al cerrar el popup y restaura la cámara', () => {
    const geometria = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-58, -35], [-58, -33], [-60, -35]]] };
    const alerta = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria
    };
    const fitBounds = vi.fn();
    const easeTo = vi.fn();
    const marcadorOficial = {
      id: 'point-official', titulo: 'Punto oficial', tipo: 'tormenta', nivel: 'precaucion', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -34, longitud: -59 }, geometria: null
    };
    (component as any).alertas = [alerta, marcadorOficial];
    (component as any).alertasPorId = new Map([[alerta.id, alerta]]);
    (component as any).map = {
      getCenter: () => ({ toArray: () => [-58.5, -34.5] }),
      getZoom: () => 9,
      getBearing: () => 12,
      getPitch: () => 4,
      getContainer: () => ({ clientHeight: 600 }),
      getSource: () => undefined,
      fitBounds,
      easeTo,
      remove: () => undefined
    };

    (component as any).iniciarExploracionCobertura(alerta);

    expect(component.modoCobertura).toBe(true);
    const [bounds, options] = fitBounds.mock.calls[0];
    expect(bounds.toArray()).toEqual([[-60, -35], [-58, -33]]);
    expect(options.padding).toEqual({ top: 104, right: 28, bottom: 136, left: 28 });
    expect((component as any).crearFeatureCollectionPoligono().features[0].geometry).toEqual(geometria);

    (component as any).cerrarPopupActivo();
    (component as any).manejarCambioDeVista();
    expect(component.modoCobertura).toBe(true);
    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(1);

    component.filtroActual = 'oficial';
    component.volverAAlertas();
    expect(component.modoCobertura).toBe(false);
    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(0);
    expect(easeTo).toHaveBeenCalledWith({
      center: [-58.5, -34.5], zoom: 9, bearing: 12, pitch: 4, duration: 350
    });
    expect(component.filtroActual).toBe('oficial');
    expect((component as any).crearFeatureCollection().features.map((feature: any) => feature.properties.id))
      .toEqual(['point-official']);
  });

  it('sale de cobertura si el filtro excluye la alerta seleccionada', () => {
    const geometria = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const alerta = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria
    };
    const easeTo = vi.fn();
    (component as any).alertas = [alerta];
    (component as any).alertasPorId = new Map([[alerta.id, alerta]]);
    (component as any).map = {
      getCenter: () => ({ toArray: () => [-58, -34] }),
      getZoom: () => 8,
      getBearing: () => 0,
      getPitch: () => 0,
      getContainer: () => ({ clientHeight: 600 }),
      getSource: () => undefined,
      fitBounds: () => undefined,
      easeTo,
      remove: () => undefined
    };
    (component as any).iniciarExploracionCobertura(alerta);

    component.filtrarAlertas('vecinal');

    expect(component.modoCobertura).toBe(false);
    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(0);
    expect(easeTo).toHaveBeenCalledWith({ center: [-58, -34], zoom: 8, bearing: 0, pitch: 0, duration: 350 });
  });

  it('actualiza la geometría durante la exploración y sale si desaparece de los datos', () => {
    const geometriaInicial = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const geometriaNueva = { type: 'MultiPolygon' as const, coordinates: [[[[-61, -36], [-58, -36], [-58, -33], [-61, -36]]]] };
    const alertaInicial = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria: geometriaInicial
    };
    const alertaNueva = { ...alertaInicial, geometria: geometriaNueva };
    const fitBounds = vi.fn();
    const easeTo = vi.fn();
    (component as any).alertasPorId = new Map([[alertaInicial.id, alertaInicial]]);
    (component as any).map = {
      getCenter: () => ({ toArray: () => [-58, -34] }),
      getZoom: () => 8,
      getBearing: () => 0,
      getPitch: () => 0,
      getContainer: () => ({ clientHeight: 600 }),
      getSource: () => undefined,
      fitBounds,
      easeTo,
      remove: () => undefined
    };
    (component as any).iniciarExploracionCobertura(alertaInicial);
    (component as any).alertasPorId.set(alertaNueva.id, alertaNueva);

    (component as any).sincronizarCoberturaConAlertas();

    expect((component as any).alertaPoligonoSeleccionada).toBe(alertaNueva);
    expect((component as any).crearFeatureCollectionPoligono().features[0].geometry).toEqual(geometriaNueva);
    expect(fitBounds).toHaveBeenCalledTimes(2);

    (component as any).alertasPorId.clear();
    (component as any).sincronizarCoberturaConAlertas();
    expect(component.modoCobertura).toBe(false);
    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(0);
    expect(easeTo).toHaveBeenCalledTimes(1);
  });

  it('oculta las capas de alertas y bloquea selecciones mientras explora una cobertura', () => {
    const geometria = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const alerta = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria
    };
    const ids = [
      'alertas-points-halo', 'alertas-points-background', 'alertas-points',
      'alertas-spiderfy-legs', 'alertas-spiderfy-halo', 'alertas-spiderfy-background',
      'alertas-spiderfy-markers', 'alertas-spiderfy-close-background', 'alertas-spiderfy-close'
    ];
    const visibility = new Map<string, string>();
    const setLayoutProperty = vi.fn((id: string, _property: string, value: string) => visibility.set(id, value));
    const queryRenderedFeatures = vi.fn(() => []);
    const map = {
      getCenter: () => ({ toArray: () => [-58, -34] }),
      getZoom: () => 8,
      getBearing: () => 0,
      getPitch: () => 0,
      getContainer: () => ({ clientHeight: 600 }),
      getSource: () => undefined,
      getLayer: (id: string) => ids.includes(id) ? { id } : undefined,
      getLayoutProperty: (id: string) => visibility.get(id),
      setLayoutProperty,
      queryRenderedFeatures,
      fitBounds: vi.fn(),
      easeTo: vi.fn(),
      remove: () => undefined
    };
    (component as any).map = map;
    (component as any).alertas = [alerta];
    (component as any).alertasPorId = new Map([[alerta.id, alerta]]);

    (component as any).iniciarExploracionCobertura(alerta);

    expect(setLayoutProperty).toHaveBeenCalledTimes(ids.length);
    expect([...visibility.values()]).toEqual(Array(ids.length).fill('none'));
    (component as any).manejarClickMapa({ point: { x: 20, y: 30 } });
    expect(queryRenderedFeatures).not.toHaveBeenCalled();
    (component as any).manejarCambioDeVista();
    expect(component.modoCobertura).toBe(true);
    expect((component as any).crearFeatureCollectionPoligono().features).toHaveLength(1);

    component.volverAAlertas();

    expect([...visibility.values()]).toEqual(Array(ids.length).fill('visible'));
    expect(map.easeTo).toHaveBeenCalledWith({ center: [-58, -34], zoom: 8, bearing: 0, pitch: 0, duration: 350 });
  });

  it('actualiza el estado reactivo de cobertura al iniciar desde un callback del mapa', () => {
    const geometria = { type: 'Polygon' as const, coordinates: [[[-60, -35], [-59, -35], [-59, -34], [-60, -35]]] };
    const alerta = {
      id: 'area', titulo: 'Área', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: null, geometria
    };
    (component as any).alertasPorId = new Map([[alerta.id, alerta]]);
    (component as any).map = {
      getCenter: () => ({ toArray: () => [-58, -34] }),
      getZoom: () => 8,
      getBearing: () => 0,
      getPitch: () => 0,
      getContainer: () => ({ clientHeight: 600 }),
      getSource: () => undefined,
      fitBounds: () => undefined,
      remove: () => undefined
    };
    const estadoReactivo = (component as any).modoCoberturaSignal;
    (component as any).iniciarExploracionCobertura(alerta);

    expect(component.modoCobertura).toBe(true);
    expect(estadoReactivo()).toBe(true);
  });

  it('mantiene el clustering desactivado en la fuente para cualquier zoom', () => {
    expect((component as any).opcionesFuenteAlertas().cluster).toBe(false);
  });

  it('usa las mismas capas visuales para los marcadores normales y los desplegados', () => {
    const layers: any[] = [];
    const map = { addLayer: (layer: any) => layers.push(layer) };
    (component as any).agregarCapasMarcador(map, 'normal', {
      halo: 'normal-halo', fondo: 'normal-background', icono: 'normal-icon'
    });
    (component as any).agregarCapasMarcador(map, 'spider', {
      halo: 'spider-halo', fondo: 'spider-background', icono: 'spider-icon'
    }, ['==', ['get', 'kind'], 'marker']);

    expect(layers[0].paint).toEqual(layers[3].paint);
    expect(layers[1].paint).toEqual(layers[4].paint);
    expect(layers[2].layout).toEqual(layers[5].layout);
    expect(layers[3].filter).toEqual(['==', ['get', 'kind'], 'marker']);
    expect(layers[4].paint).not.toHaveProperty('circle-stroke-color');
    expect(layers[4].paint).not.toHaveProperty('circle-stroke-width');
  });

  it('despliega eventos con coordenadas idénticas como marcadores individuales con líneas al origen', () => {
    const first = {
      id: 'a', titulo: 'A', tipo: 'sismo', nivel: 'informativo', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null,
      ubicacion: { latitud: -35, longitud: -60 }, geometria: null
    };
    const second = { ...first, id: 'b', titulo: 'B' };
    component.alertas = [first, second] as any;
    (component as any).map = {
      project: ([lng, lat]: [number, number]) => ({ x: lng, y: lat }),
      unproject: ([x, y]: [number, number]) => ({ lng: x, lat: y }),
      getSource: () => undefined,
      remove: () => undefined
    };

    const originalA = { ...first.ubicacion };
    const geojson = (component as any).crearColeccionSpiderfy(component.alertas, [-60, -35]);
    const markers = geojson.features.filter((feature: any) => feature.properties.kind === 'marker');
    const legs = geojson.features.filter((feature: any) => feature.properties.kind === 'leg');

    expect(markers).toHaveLength(2);
    expect(new Set(markers.map((feature: any) => feature.properties.id))).toEqual(new Set(['a', 'b']));
    expect(new Set(markers.map((feature: any) => feature.geometry.coordinates.join(','))).size).toBe(2);
    expect(legs).toHaveLength(2);
    expect(legs[0].geometry.coordinates[0]).toEqual([-60, -35]);
    expect(first.ubicacion).toEqual(originalA);
    expect(geojson.features.filter((feature: any) => feature.properties.kind === 'center')).toHaveLength(1);
  });

  it('detecta cercanía en píxeles entre puntos visibles sin comparar todos los eventos', () => {
    const alertas = [
      { id: 'a', ubicacion: { latitud: 0, longitud: 0 } },
      { id: 'b', ubicacion: { latitud: 0, longitud: 40 } },
      { id: 'c', ubicacion: { latitud: 0, longitud: 100 } }
    ];
    (component as any).alertasPorId = new Map(alertas.map(alerta => [alerta.id, alerta]));
    (component as any).map = {
      queryRenderedFeatures: () => alertas.map(alerta => ({
        geometry: { type: 'Point', coordinates: [alerta.ubicacion.longitud, alerta.ubicacion.latitud] },
        properties: { id: alerta.id }
      })),
      project: ([lng, lat]: [number, number]) => ({ x: lng, y: lat }),
      getSource: () => undefined,
      remove: () => undefined
    };

    const result = (component as any).obtenerAlertasSuperpuestas({ x: 0, y: 0 });
    expect(result.map((item: any) => item.alerta.id)).toEqual(['a', 'b']);
    expect(result[0].coordinates).toEqual([0, 0]);
    expect(result[1].coordinates).toEqual([40, 0]);
  });

  it('restaura los puntos originales al cerrar el despliegue y conserva sus coordenadas', () => {
    component.alertas = [
      { id: 'a', titulo: 'A', tipo: 'sismo', nivel: 'informativo', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria: null },
      { id: 'b', titulo: 'B', tipo: 'sismo', nivel: 'informativo', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria: null },
      { id: 'c', titulo: 'C', tipo: 'sismo', nivel: 'informativo', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -34, longitud: -59 }, geometria: null }
    ] as any;
    (component as any).spiderfiedIds = new Set(['a', 'b']);
    (component as any).map = { getSource: () => undefined, remove: () => undefined };

    expect((component as any).crearFeatureCollection().features.map((feature: any) => feature.properties.id)).toEqual(['c']);
    (component as any).cerrarSpiderfy();
    const restored = (component as any).crearFeatureCollection().features;

    expect(restored.map((feature: any) => feature.properties.id)).toEqual(['a', 'b', 'c']);
    expect(restored[0].geometry.coordinates).toEqual([-60, -35]);
    expect(component.alertas[0].ubicacion).toEqual({ latitud: -35, longitud: -60 });
  });

  it('cierra el despliegue antes de actualizar los datos visibles', () => {
    component.alertas = [
      { id: 'a', titulo: 'A', tipo: 'sismo', nivel: 'informativo', origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria: null }
    ] as any;
    (component as any).spiderfiedIds = new Set(['a']);
    (component as any).map = { getSource: () => undefined, remove: () => undefined };

    (component as any).actualizarFuenteAlertas();

    expect((component as any).spiderfiedIds.size).toBe(0);
  });

  it('selecciona el evento correspondiente al marcador desplegado', () => {
    const alerta = {
      id: 'selected', titulo: 'Alerta elegida', tipo: 'sismo', nivel: 'informativo', origen: 'oficial',
      descripcion: '', fechaInicio: null, fechaFin: null, ubicacion: { latitud: -35, longitud: -60 }, geometria: null
    };
    (component as any).alertasPorId = new Map([[alerta.id, alerta]]);
    (component as any).spiderfiedIds = new Set([alerta.id]);
    const markerFeature = {
      geometry: { type: 'Point', coordinates: [-60.1, -35.1] },
      properties: { id: alerta.id }
    };
    (component as any).map = {
      queryRenderedFeatures: (_point: unknown, options: { layers: string[] }) =>
        options.layers[0] === 'alertas-spiderfy-background' ? [markerFeature] : [],
      project: () => ({ x: 10, y: 10 }),
      getSource: () => undefined,
      remove: () => undefined
    };
    const abrir = vi.spyOn(component as any, 'abrirPopupAlerta').mockImplementation(() => undefined);

    (component as any).manejarClickMapa({ point: { x: 10, y: 10 } });

    expect(abrir).toHaveBeenCalledWith(alerta, [-60.1, -35.1], true);
  });
});
