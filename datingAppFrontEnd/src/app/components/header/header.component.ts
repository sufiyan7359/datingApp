import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
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
