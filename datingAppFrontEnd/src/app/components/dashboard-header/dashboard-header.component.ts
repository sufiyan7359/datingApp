import { Component, OnInit, computed, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChatService } from '../../core/chat/chat.service';

@Component({
    selector: 'app-dashboard-header',
    templateUrl: './dashboard-header.component.html',
    styleUrls: ['./dashboard-header.component.css'],
    imports: [RouterLink, RouterLinkActive, NgIf]
})
export class DashboardHeaderComponent implements OnInit {
  private readonly chatService = inject(ChatService);

  readonly unreadCount = computed(() =>
    this.chatService.conversations().reduce((sum, c) => sum + c.unreadCount, 0),
  );

  ngOnInit(): void {
    this.chatService.loadConversations().subscribe();
  }
}
