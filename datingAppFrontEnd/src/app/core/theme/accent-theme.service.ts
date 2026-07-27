import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'datingapp_accent';

export interface AccentPalette {
  id: string;
  label: string;
  accent: string;
  accentStrong: string;
  accentRgb: string;
}

const PALETTES: AccentPalette[] = [
  { id: 'red', label: 'Red', accent: '#ff0000', accentStrong: '#b30000', accentRgb: '255, 0, 0' },
  { id: 'pink', label: 'Pink', accent: '#ff2d78', accentStrong: '#b3004f', accentRgb: '255, 45, 120' },
  { id: 'purple', label: 'Purple', accent: '#8b5cf6', accentStrong: '#5b21b6', accentRgb: '139, 92, 246' },
  { id: 'blue', label: 'Blue', accent: '#2563eb', accentStrong: '#1e3a8a', accentRgb: '37, 99, 235' },
  { id: 'teal', label: 'Teal', accent: '#0d9488', accentStrong: '#0f766e', accentRgb: '13, 148, 136' },
  { id: 'orange', label: 'Orange', accent: '#f97316', accentStrong: '#c2410c', accentRgb: '249, 115, 22' },
  { id: 'green', label: 'Green', accent: '#16a34a', accentStrong: '#15803d', accentRgb: '22, 163, 74' },
];

const DEFAULT_PALETTE_ID = PALETTES[0].id;

@Injectable({ providedIn: 'root' })
export class AccentThemeService {
  readonly palettes = PALETTES;
  readonly accentId = signal(this.readStoredAccent());

  constructor() {
    // Applied here (not just from a component) so the accent color is set as
    // early as possible - mirrors ThemeService, which does the same for
    // dark/light mode.
    this.apply(this.accentId());
  }

  set(accentId: string): void {
    this.accentId.set(accentId);
    this.apply(accentId);
    localStorage.setItem(STORAGE_KEY, accentId);
  }

  private apply(accentId: string): void {
    const palette = this.palettes.find((p) => p.id === accentId) ?? this.palettes[0];
    const root = document.documentElement.style;
    root.setProperty('--accent', palette.accent);
    root.setProperty('--accent-strong', palette.accentStrong);
    root.setProperty('--accent-rgb', palette.accentRgb);

    // Keeps the mobile browser chrome/PWA title bar color in sync too -
    // index.html's <meta name="theme-color"> is a static tag the OS reads
    // outside of CSS, so it needs its own update rather than a CSS variable.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.accent);
  }

  private readStoredAccent(): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && PALETTES.some((p) => p.id === stored) ? stored : DEFAULT_PALETTE_ID;
  }
}
