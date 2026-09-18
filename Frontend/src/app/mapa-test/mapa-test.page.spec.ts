import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaTestPage } from './mapa-test.page';

describe('MapaTestPage', () => {
  let component: MapaTestPage;
  let fixture: ComponentFixture<MapaTestPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapaTestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
