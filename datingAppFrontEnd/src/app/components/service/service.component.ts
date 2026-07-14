import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Service {
  icon: string;
  title: string;
  description: string;
}

const SERVICES: Service[] = [
  {
    icon: 'bi-people-fill',
    title: 'Smart Matching',
    description: 'Our discovery engine learns your preferences and surfaces people you are genuinely compatible with, not just nearby.',
  },
  {
    icon: 'bi-chat-heart-fill',
    title: 'Real-time Chat',
    description: 'Message your matches instantly with read receipts, reactions, replies, and shareable photos or voice notes.',
  },
  {
    icon: 'bi-camera-video-fill',
    title: 'Voice & Video Calls',
    description: 'Get to know someone face-to-face before meeting up, right inside the app - no phone number required.',
  },
  {
    icon: 'bi-patch-check-fill',
    title: 'Verified Profiles',
    description: 'Photo verification and fake-profile detection keep the community genuine, so you know who you are really talking to.',
  },
  {
    icon: 'bi-shield-lock-fill',
    title: 'Privacy & Safety',
    description: 'Blur your photos until you match, block or report anyone in one tap, and control exactly who can see your profile.',
  },
  {
    icon: 'bi-gem',
    title: 'Premium Membership',
    description: 'Unlock unlimited likes, see who liked you first, and boost your profile to the top of the stack.',
  },
];

@Component({
  selector: 'app-service',
  templateUrl: './service.component.html',
  styleUrls: ['./service.component.css'],
  imports: [NgFor, RouterLink],
})
export class ServiceComponent {
  readonly services = SERVICES;
}
