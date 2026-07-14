import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

interface PrivacySection {
  icon: string;
  title: string;
  points: string[];
}

const SECTIONS: PrivacySection[] = [
  {
    icon: 'bi-collection-fill',
    title: 'What We Collect',
    points: [
      'Profile details you provide - name, birth date, photos, bio, and preferences.',
      'Activity that makes matching work - swipes, matches, and messages between matched users.',
      'Basic device and usage data used to keep the app secure and reliable.',
    ],
  },
  {
    icon: 'bi-gear-fill',
    title: 'How We Use It',
    points: [
      'To power discovery and match you with people who fit your preferences.',
      'To deliver messages, calls, and notifications between you and your matches.',
      'To detect fake profiles and enforce our community and safety rules.',
    ],
  },
  {
    icon: 'bi-eye-slash-fill',
    title: 'What You Control',
    points: [
      'Blur your photos until someone matches with you, from Profile > Photos.',
      'Hide your age, distance, or online status from Profile > Settings.',
      'Go incognito, or delete individual photos and your account entirely, at any time.',
    ],
  },
  {
    icon: 'bi-shield-lock-fill',
    title: 'Safety Controls',
    points: [
      'Block or report anyone in one tap - blocking is always silent, the other person is never notified.',
      'Two-factor authentication is available to add an extra layer of login security.',
      'Our team reviews reports and can suspend accounts that violate community guidelines.',
    ],
  },
  {
    icon: 'bi-lock-fill',
    title: 'Data Sharing',
    points: [
      'We never sell your personal data to third parties.',
      'Your profile is only visible to other users through the app - matched users see full photos, everyone else sees what your privacy settings allow.',
      'We use trusted infrastructure providers only to run the service itself (hosting, storage, email delivery).',
    ],
  },
];

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css'],
  imports: [NgFor, RouterLink],
})
export class PrivacyComponent {
  readonly sections = SECTIONS;
}
