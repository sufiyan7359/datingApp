import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { DashboardHeaderComponent } from "../dashboard-header/dashboard-header.component";
import { NgFor, NgStyle } from "@angular/common";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    imports: [DashboardHeaderComponent, NgFor, NgStyle]
})
export class DashboardComponent implements OnInit {
addRequest:boolean[] = [];  
MessageSend:boolean[] = [];
  constructor(private router:Router) { }

  ngOnInit(): void {
    
  }
  
  sendMessage(index:any){
 this.router.navigate(['/chating',index]);
 this.MessageSend[index] =! this.MessageSend[index];
   }



   addReq(index:any){
this.addRequest[index] =! this.addRequest[index];
   }

}
