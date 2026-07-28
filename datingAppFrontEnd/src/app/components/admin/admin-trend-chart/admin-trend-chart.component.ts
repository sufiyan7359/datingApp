import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

export interface TrendPoint {
  date: string;
  value: number;
}

interface TrendCoord {
  x: number;
  y: number;
  date: string;
  value: number;
}

let instanceCounter = 0;

/**
 * A single-series area chart, meant to be shown as one of several small
 * multiples (see admin-dashboard) rather than combined into one dual-axis
 * chart - each metric here differs by orders of magnitude, so sharing an
 * axis would flatten the smaller series to a flat line. The line is
 * Catmull-Rom-smoothed into cubic beziers (tension 1/6, no overshoot on
 * monotonic-ish daily counts) and filled down to the baseline with a
 * gradient that fades to transparent - each instance gets its own
 * gradient id so multiple charts on one page don't collide.
 */
@Component({
  selector: 'app-admin-trend-chart',
  templateUrl: './admin-trend-chart.component.html',
  styleUrls: ['./admin-trend-chart.component.css'],
  imports: [NgFor, NgIf],
})
export class AdminTrendChartComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) color = '#2a78d6';
  @Input({ required: true }) points: TrendPoint[] = [];

  readonly gradientId = `trend-gradient-${instanceCounter++}`;

  readonly width = 320;
  readonly height = 128;
  private readonly paddingX = 6;
  private readonly paddingY = 16;

  hoverIndex: number | null = null;

  get maxValue(): number {
    return Math.max(1, ...this.points.map((p) => p.value));
  }

  get total(): number {
    return this.points.reduce((sum, p) => sum + p.value, 0);
  }

  get latest(): number {
    return this.points.length ? this.points[this.points.length - 1].value : 0;
  }

  get coords(): TrendCoord[] {
    const n = this.points.length;
    if (n === 0) return [];
    const max = this.maxValue;
    const innerWidth = this.width - this.paddingX * 2;
    const innerHeight = this.height - this.paddingY * 2;
    return this.points.map((p, i) => ({
      x: n === 1 ? this.paddingX : this.paddingX + (i / (n - 1)) * innerWidth,
      y: this.paddingY + innerHeight - (p.value / max) * innerHeight,
      date: p.date,
      value: p.value,
    }));
  }

  /** Catmull-Rom -> cubic bezier smoothing, tension 1/6. */
  get linePath(): string {
    const pts = this.coords;
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  get areaPath(): string {
    const line = this.linePath;
    const pts = this.coords;
    if (!line || pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `${line} L ${last.x.toFixed(2)} ${this.baselineY} L ${first.x.toFixed(2)} ${this.baselineY} Z`;
  }

  get baselineY(): number {
    return this.height - this.paddingY;
  }

  get hoverPoint(): TrendCoord | null {
    return this.hoverIndex !== null ? this.coords[this.hoverIndex] : null;
  }

  onMouseMove(event: MouseEvent): void {
    const svgEl = event.currentTarget as SVGSVGElement;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width === 0) return;
    const scaleX = this.width / rect.width;
    const x = (event.clientX - rect.left) * scaleX;
    const c = this.coords;
    if (c.length === 0) return;

    let nearest = 0;
    let minDist = Infinity;
    c.forEach((pt, i) => {
      const dist = Math.abs(pt.x - x);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    this.hoverIndex = nearest;
  }

  onMouseLeave(): void {
    this.hoverIndex = null;
  }

  formatDate(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
