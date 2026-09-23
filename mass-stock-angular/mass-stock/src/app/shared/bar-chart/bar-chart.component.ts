import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarChartSerie {
  nombre: string;
  color: string;
  valores: number[];
}

// Gráfico de barras agrupadas en SVG (una barra por serie en cada etiqueta del eje X).
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.css',
})
export class BarChartComponent {
  @Input() set etiquetas(v: string[]) {
    this._etiquetas.set(v ?? []);
  }
  @Input() set series(v: BarChartSerie[]) {
    this._series.set(v ?? []);
  }
  @Input() alto = 220;

  private _etiquetas = signal<string[]>([]);
  private _series = signal<BarChartSerie[]>([]);
  hover = signal<number | null>(null);

  readonly ancho = 640;
  readonly margenIzq = 34;
  readonly margenInf = 28;
  readonly margenSup = 10;

  get altoUtil(): number {
    return this.alto - this.margenInf - this.margenSup;
  }

  max = computed(() => {
    const m = Math.max(1, ...this._series().flatMap((s) => s.valores));
    // redondeo "bonito" para que las líneas guía caigan en números limpios
    const paso = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / paso) * paso;
  });

  guias = computed(() => {
    const max = this.max();
    return Array.from({ length: 6 }, (_, i) => Math.round((max / 5) * i));
  });

  grupos = computed(() => {
    const etiquetas = this._etiquetas();
    const series = this._series();
    const max = this.max();
    const paso = (this.ancho - this.margenIzq) / Math.max(etiquetas.length, 1);
    const anchoBarra = Math.min(26, (paso * 0.62) / Math.max(series.length, 1));
    const gap = 4;
    const anchoGrupo = series.length * anchoBarra + (series.length - 1) * gap;

    return etiquetas.map((label, i) => {
      const x0 = this.margenIzq + i * paso + (paso - anchoGrupo) / 2;
      return {
        label,
        x: this.margenIzq + i * paso,
        paso,
        centro: this.margenIzq + i * paso + paso / 2,
        barras: series.map((s, j) => {
          const v = s.valores[i] ?? 0;
          const h = (v / max) * this.altoUtil;
          return { x: x0 + j * (anchoBarra + gap), y: this.margenSup + this.altoUtil - h, w: anchoBarra, h, color: s.color, v, nombre: s.nombre };
        }),
      };
    });
  });

  yDe(v: number): number {
    return this.margenSup + this.altoUtil * (1 - v / this.max());
  }

  get vacio(): boolean {
    return this._etiquetas().length === 0;
  }
}
