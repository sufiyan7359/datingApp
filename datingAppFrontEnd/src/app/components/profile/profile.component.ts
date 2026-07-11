import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  about:boolean=false;
  profile:boolean=false;
  setting:boolean=false;
  photos:boolean=false;

  constructor() { }

  ngOnInit(): void {
  this.about=true;
  }


Profile(){
this.profile = true;
this.about =false;
this.setting =false;
this.photos =false;
}

About(){
  this.profile = false;
  this.about =true;
  this.setting =false;
  this.photos =false;
}

Photos(){
  this.profile = false;
  this.about =false;
  this.setting =false;
  this.photos =true;
}

Setting(){
  this.profile = false;
  this.about =false;
  this.setting =true;
  this.photos =false;
}

}
