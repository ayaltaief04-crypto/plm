import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechPackPreviewComponent } from './tech-pack-preview.component';

describe('TechPackPreviewComponent', () => {
  let component: TechPackPreviewComponent;
  let fixture: ComponentFixture<TechPackPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechPackPreviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechPackPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
