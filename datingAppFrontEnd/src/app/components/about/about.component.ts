import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Value {
  icon: string;
  title: string;
  description: string;
}

const VALUES: Value[] = [
  {
    icon: 'bi-emoji-smile-fill',
    title: 'Real Connections',
    description: 'Smart matching and video dates before meeting up, so you build a genuine connection before you ever meet in person.',
  },
  {
    icon: 'bi-patch-check-fill',
    title: 'Authenticity First',
    description: 'Photo verification and fake-profile detection keep the community made of real people, not bots or catfish.',
  },
  {
    icon: 'bi-shield-lock-fill',
    title: 'Safety By Default',
    description: 'Blurred photos until you match, one-tap blocking and reporting, and full control over who can see your profile.',
  },
];

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [NgFor, RouterLink],
})
export class AboutComponent {
  readonly values = VALUES;
}
