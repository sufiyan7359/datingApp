import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatingBoxComponent } from './chating-box.component';

describe('ChatingBoxComponent', () => {
  let component: ChatingBoxComponent;
  let fixture: ComponentFixture<ChatingBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChatingBoxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatingBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
