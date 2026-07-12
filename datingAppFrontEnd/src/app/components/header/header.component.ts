import { Component, HostListener, OnInit } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    imports: [NgStyle, RouterLink]
})
export class HeaderComponent implements OnInit {
  bgColor = 'transparent';// Initialize header as transparent

  constructor() { }

  ngOnInit(): void {
  }


  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    if (window.pageYOffset > 10) {
      this.bgColor = '#ffff'; // Change background color after scrolling 50px
    } else {
      this.bgColor = 'transparent'; // Change background color back to transparent
    }
  }

}
