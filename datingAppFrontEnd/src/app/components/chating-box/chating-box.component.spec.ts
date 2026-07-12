import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ChatingBoxComponent } from './chating-box.component';

describe('ChatingBoxComponent', () => {
  let component: ChatingBoxComponent;
  let fixture: ComponentFixture<ChatingBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [ChatingBoxComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
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
