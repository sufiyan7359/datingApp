import { Component, signal } from '@angular/core';
import { NgFor } from '@angular/common';

interface BlogPost {
  icon: string;
  tag: string;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  body: string;
}

const POSTS: BlogPost[] = [
  {
    icon: 'bi-chat-heart-fill',
    tag: 'Conversation',
    title: '7 Icebreakers That Actually Get a Reply',
    date: 'Jun 12, 2026',
    readTime: '4 min read',
    excerpt: 'Skip the "hey" - here are opening lines that turn a match into a real conversation.',
    body: 'Skip the "hey" - here are opening lines that turn a match into a real conversation. Ask about something specific in their profile instead of a generic compliment: a trip photo, a book on their shelf, or a hobby they mentioned. Specific questions signal you actually read their profile, and they are far easier to answer than "how are you?". Keep your first message short - one question is more inviting than three. And if a conversation stalls, it is fine to suggest moving to a call; tone carries a lot that text cannot.',
  },
  {
    icon: 'bi-shield-lock-fill',
    tag: 'Safety',
    title: 'Staying Safe While Meeting Someone New',
    date: 'May 28, 2026',
    readTime: '5 min read',
    excerpt: 'A few simple habits make meeting matches in person dramatically safer.',
    body: 'A few simple habits make meeting matches in person dramatically safer. Always video call before a first date - it confirms the person matches their photos. Meet in a public place for the first time, and tell a friend where you are going and who with. Use the app\'s built-in call and chat features for as long as possible before sharing personal contact details. And trust your instincts: if a profile or a conversation feels off, our block and report tools are one tap away, and blocking someone is always silent.',
  },
  {
    icon: 'bi-camera-video-fill',
    tag: 'Video Dates',
    title: 'Why Your First Date Should Be a Video Call',
    date: 'May 14, 2026',
    readTime: '3 min read',
    excerpt: 'Video dates cut through the guesswork before you ever leave the house.',
    body: 'Video dates cut through the guesswork before you ever leave the house. A 15-20 minute call tells you more about chemistry than days of texting - tone, humor, and body language do not translate well over chat. It also confirms authenticity, protecting you from catfishing. If the call goes well, you will walk into your in-person date already comfortable with each other, which takes the pressure off both of you.',
  },
  {
    icon: 'bi-person-hearts',
    tag: 'Profile Tips',
    title: 'Building a Profile That Reflects the Real You',
    date: 'Apr 30, 2026',
    readTime: '4 min read',
    excerpt: 'The best-performing profiles are specific, not just flattering.',
    body: 'The best-performing profiles are specific, not just flattering. Swap generic gym-mirror selfies for photos that show you doing something - hiking, cooking, at a concert. Write a bio with a hook or a light opinion ("will debate you on pineapple pizza") instead of a resume of adjectives. Fill in your interests and prompts fully; they are what our matching engine uses to surface you to people who actually share your interests, not just your city.',
  },
  {
    icon: 'bi-heart-pulse-fill',
    tag: 'Mindset',
    title: 'Handling Rejection Without Losing Momentum',
    date: 'Apr 9, 2026',
    readTime: '3 min read',
    excerpt: 'An unmatch or a slow fade says very little about you - here is how to keep going.',
    body: 'An unmatch or a slow fade says very little about you - here is how to keep going. Dating apps involve a numbers game; even great profiles get passed on for reasons that have nothing to do with you. Give yourself permission to feel it, then get back to swiping with intent rather than volume. Quality conversations with a handful of well-matched people beat chasing every like. Take breaks when it starts to feel like a chore - burnout is the biggest reason people quit too early.',
  },
  {
    icon: 'bi-gem',
    tag: 'Premium',
    title: 'Getting the Most Out of Premium',
    date: 'Mar 22, 2026',
    readTime: '3 min read',
    excerpt: 'Unlimited likes are just the start - here is how premium members match faster.',
    body: 'Unlimited likes are just the start - here is how premium members match faster. Seeing who already liked you means you can skip straight to matching with people who are interested, instead of hoping your like gets noticed. A weekly boost puts your profile in front of far more people in your area for a short window - schedule it for your most active hours. And travel mode lets you line up matches in a city before you land, so your evenings are already booked.',
  },
];

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css'],
  imports: [NgFor],
})
export class BlogComponent {
  readonly posts = POSTS;
  private readonly expandedIndexes = signal<Set<number>>(new Set());

  isExpanded(index: number): boolean {
    return this.expandedIndexes().has(index);
  }

  toggle(index: number): void {
    this.expandedIndexes.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
}
