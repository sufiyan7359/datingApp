import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-dashboard-header',
    templateUrl: './dashboard-header.component.html',
    styleUrls: ['./dashboard-header.component.css'],
    imports: [RouterLink]
})
export class DashboardHeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
