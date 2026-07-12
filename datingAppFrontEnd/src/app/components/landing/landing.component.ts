import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css'],
    imports: [RouterLink]
})
export class LandingComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
