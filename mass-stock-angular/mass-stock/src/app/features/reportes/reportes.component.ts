import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { descargarCsv } from '../../core/csv.util';
import { iniciales, tonoThumb, mensajeError } from '../../core/ui.util';
import { RotacionProducto } from '../../models/reporte.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';

type Orden = 'total' | 'salida' | 'nombre';

// Circunferencia del donut (r = 60) para calcular los arcos con stroke-dasharray.
const CIRC = 2 * Math.PI * 60;

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, WordmarkComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent implements OnInit {
  filas: RotacionProducto[] = [];
  loading = true;
  errorMsg: string | null = null;
  dias = 30;

  texto = '';
  categoria = '';
  orden: Orden = 'total';

  readonly circ = CIRC;
  readonly iniciales = iniciales;
  readonly tonoThumb = tonoThumb;

  readonly rangos = [
    { label: '7 días', valor: 7 },
    { label: '30 días', valor: 30 },
    { label: '90 días', valor: 90 },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cambiarRango(dias: number): void {
    this.dias = dias;
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading = true;
    try {
      this.filas = await this.api.obtenerReporteRotacion(this.dias);
      this.errorMsg = null;
    } catch (err: any) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  total(r: RotacionProducto): number {
    return r.totalIngresado + r.totalRepuesto + r.totalSalida;
  }

  get ranking(): RotacionProducto[] {
    return [...this.filas].sort((a, b) => this.total(b) - this.total(a));
  }

  get top(): RotacionProducto[] {
    return this.ranking.slice(0, 6);
  }

  get masRotado(): RotacionProducto | null {
    return this.ranking[0] ?? null;
  }

  get maxTotal(): number {
    return Math.max(...this.filas.map((f) => this.total(f)), 1);
  }

  get totalMovimientos(): number {
    return this.filas.reduce((acc, f) => acc + f.movimientos, 0);
  }

  get totalUnidades(): number {
    return this.filas.reduce((acc, f) => acc + this.total(f), 0);
  }

  pct(n: number): number {
    return this.totalUnidades ? Math.round((n / this.totalUnidades) * 100) : 0;
  }

  get categorias(): string[] {
    return [...new Set(this.filas.map((f) => f.categoria).filter((c): c is string => !!c))].sort();
  }

  get filtradas(): RotacionProducto[] {
    const q = this.texto.trim().toLowerCase();
    const lista = this.ranking.filter((f) => {
      if (this.categoria && f.categoria !== this.categoria) return false;
      if (q && !`${f.nombre} ${f.sku}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (this.orden === 'salida') return lista.sort((a, b) => b.totalSalida - a.totalSalida);
    if (this.orden === 'nombre') return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return lista;
  }

  posicion(f: RotacionProducto): number {
    return this.ranking.indexOf(f) + 1;
  }

  /** Segmentos del donut: ingresos, reposiciones y salidas. */
  get distribucion(): { nombre: string; valor: number; color: string; dash: string; offset: number }[] {
    const partes = [
      { nombre: 'Ingresos de proveedor', valor: this.filas.reduce((a, f) => a + f.totalIngresado, 0), color: 'var(--brand-blue)' },
      { nombre: 'Reposiciones de percha', valor: this.filas.reduce((a, f) => a + f.totalRepuesto, 0), color: 'var(--brand-yellow)' },
      { nombre: 'Salidas (venta/ajuste)', valor: this.filas.reduce((a, f) => a + f.totalSalida, 0), color: 'var(--red)' },
    ];
    const total = Math.max(this.totalUnidades, 1);
    let acumulado = 0;
    return partes.map((p) => {
      const largo = (p.valor / total) * CIRC;
      const seg = { ...p, dash: `${largo} ${CIRC - largo}`, offset: -acumulado };
      acumulado += largo;
      return seg;
    });
  }

  exportarCsv(): void {
    descargarCsv(
      `reporte-rotacion-${this.dias}dias.csv`,
      ['Producto', 'SKU', 'Categoría', 'Ingresado', 'Repuesto', 'Salida', 'Total', 'Movimientos'],
      this.filas.map((f) => [
        f.nombre, f.sku, f.categoria ?? '', f.totalIngresado, f.totalRepuesto, f.totalSalida, this.total(f), f.movimientos,
      ])
    );
  }
}
