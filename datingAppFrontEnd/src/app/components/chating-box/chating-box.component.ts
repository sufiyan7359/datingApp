import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService ,Message} from '../service/chat.service';

@Component({
  selector: 'app-chating-box',
  templateUrl: './chating-box.component.html',
  styleUrls: ['./chating-box.component.css']
})
export class ChatingBoxComponent implements OnInit {
  messages: Message[] = [];
  value: string;
  constructor(public chatService: ChatService) { }

  


  
  ngOnInit() {
    this.chatService.conversation.subscribe((val) => {
    this.messages = this.messages.concat(val);
  });
}

sendMessage() {
  this.chatService.getBotAnswer(this.value);
  this.value = '';
}

}