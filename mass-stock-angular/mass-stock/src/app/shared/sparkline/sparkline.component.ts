import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [attr.width]="width" [attr.height]="height" class="sparkline">
      <polyline [attr.points]="puntosArea()" class="spark-area" />
      <polyline [attr.points]="puntosLinea()" class="spark-line" />
      <circle *ngIf="ultimoPunto() as p" [attr.cx]="p.x" [attr.cy]="p.y" r="2.5" class="spark-dot" />
    </svg>
  `,
  styles: [`
    .sparkline { display: block; overflow: visible; }
    .spark-line { fill: none; stroke: var(--brand-navy); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .spark-area { fill: color-mix(in srgb, var(--brand-navy) 14%, transparent); stroke: none; }
    .spark-dot { fill: var(--brand-navy); }
  `],
})
export class SparklineComponent {
  @Input() set valores(v: number[]) {
    this._valores.set(v && v.length > 0 ? v : [0]);
  }
  @Input() width = 90;
  @Input() height = 30;

  private _valores = signal<number[]>([0]);

  private escala = computed(() => {
    const datos = this._valores();
    const max = Math.max(...datos, 1);
    const min = Math.min(...datos, 0);
    const rango = max - min || 1;
    const paso = datos.length > 1 ? this.width / (datos.length - 1) : this.width;
    return { max, min, rango, paso };
  });

  private puntos = computed(() => {
    const datos = this._valores();
    const { min, rango, paso } = this.escala();
    return datos.map((v, i) => ({
      x: i * paso,
      y: this.height - ((v - min) / rango) * (this.height - 4) - 2,
    }));
  });

  puntosLinea = computed(() => this.puntos().map((p) => `${p.x},${p.y}`).join(' '));

  puntosArea = computed(() => {
    const pts = this.puntos();
    if (pts.length === 0) return '';
    const primero = pts[0];
    const ultimo = pts[pts.length - 1];
    const base = `${primero.x},${this.height} ` + pts.map((p) => `${p.x},${p.y}`).join(' ') + ` ${ultimo.x},${this.height}`;
    return base;
  });

  ultimoPunto = computed(() => this.puntos()[this.puntos().length - 1] ?? null);
}
