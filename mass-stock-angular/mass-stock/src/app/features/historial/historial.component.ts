import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { descargarCsv } from '../../core/csv.util';
import { iniciales, tonoThumb, mensajeError } from '../../core/ui.util';
import { MovimientoHistorial } from '../../models/proveedor.model';
import { IconComponent } from '../../shared/icon/icon.component';

type Filtro = 'todos' | 'ingreso' | 'reposicion' | 'salida';

const POR_PAGINA = 10;

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css',
})
export class HistorialComponent implements OnInit {
  movimientos: MovimientoHistorial[] = [];
  loading = true;
  errorMsg: string | null = null;

  filtro: Filtro = 'todos';
  texto = '';
  usuario = '';
  desde = '';
  hasta = '';
  pagina = 1;

  readonly filtros: { valor: Filtro; label: string }[] = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'ingreso', label: 'Ingresos' },
    { valor: 'reposicion', label: 'Reposiciones' },
    { valor: 'salida', label: 'Salidas' },
  ];

  readonly iniciales = iniciales;
  readonly tonoThumb = tonoThumb;

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    try {
      this.movimientos = await this.api.listarHistorial(300);
    } catch (err) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  contar(f: Filtro): number {
    if (f === 'todos') return this.movimientos.length;
    if (f === 'salida') return this.movimientos.filter((m) => this.esSalida(m.tipo)).length;
    return this.movimientos.filter((m) => m.tipo === f).length;
  }

  get usuarios(): string[] {
    return [...new Set(this.movimientos.map((m) => m.usuario).filter((u): u is string => !!u))].sort();
  }

  get filtrados(): MovimientoHistorial[] {
    const q = this.texto.trim().toLowerCase();
    const desde = this.desde ? new Date(this.desde + 'T00:00:00').getTime() : null;
    const hasta = this.hasta ? new Date(this.hasta + 'T23:59:59').getTime() : null;
    return this.movimientos.filter((m) => {
      if (this.filtro === 'salida' && !this.esSalida(m.tipo)) return false;
      if (this.filtro !== 'todos' && this.filtro !== 'salida' && m.tipo !== this.filtro) return false;
      if (this.usuario && m.usuario !== this.usuario) return false;
      if (q && !`${m.productoNombre} ${m.productoSku}`.toLowerCase().includes(q)) return false;
      const t = new Date(m.createdAt).getTime();
      if (desde !== null && t < desde) return false;
      if (hasta !== null && t > hasta) return false;
      return true;
    });
  }

  get paginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / POR_PAGINA));
  }

  get paginaActual(): number {
    return Math.min(this.pagina, this.paginas);
  }

  get visibles(): MovimientoHistorial[] {
    const p = this.paginaActual;
    return this.filtrados.slice((p - 1) * POR_PAGINA, p * POR_PAGINA);
  }

  get rango(): string {
    if (this.filtrados.length === 0) return '0';
    const inicio = (this.paginaActual - 1) * POR_PAGINA + 1;
    return `${inicio} - ${inicio + this.visibles.length - 1}`;
  }

  /** Números de página a mostrar, con "…" cuando hay muchas. */
  get listaPaginas(): (number | '…')[] {
    const n = this.paginas;
    const p = this.paginaActual;
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const nums = new Set([1, 2, p - 1, p, p + 1, n].filter((x) => x >= 1 && x <= n));
    const orden = [...nums].sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    orden.forEach((x, i) => {
      if (i > 0 && x - orden[i - 1] > 1) out.push('…');
      out.push(x);
    });
    return out;
  }

  irPagina(p: number | '…'): void {
    if (p === '…') return;
    this.pagina = Math.min(Math.max(1, p), this.paginas);
  }

  cambiarFiltro(f: Filtro): void {
    this.filtro = f;
    this.pagina = 1;
  }

  esSalida(tipo: string): boolean {
    return tipo === 'venta' || tipo === 'ajuste';
  }

  etiquetaTipo(tipo: string): string {
    if (tipo === 'ingreso') return 'Ingreso';
    if (tipo === 'reposicion') return 'Reposición';
    if (tipo === 'venta') return 'Venta';
    if (tipo === 'ajuste') return 'Ajuste';
    return tipo;
  }

  detalleTipo(tipo: string): string {
    if (tipo === 'ingreso') return 'Ingreso de proveedor';
    if (tipo === 'reposicion') return 'Reposición de percha';
    if (tipo === 'venta') return 'Venta';
    return 'Merma / ajuste';
  }

  iconoTipo(tipo: string): string {
    if (tipo === 'ingreso') return 'arrow-right';
    if (tipo === 'reposicion') return 'refresh';
    return 'arrow-up-right';
  }

  claseTipo(tipo: string): string {
    if (tipo === 'ingreso') return 'green';
    if (tipo === 'reposicion') return 'yellow';
    return 'red';
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  exportarCsv(): void {
    descargarCsv(
      'historial-movimientos.csv',
      ['Fecha', 'Tipo', 'Producto', 'SKU', 'Cantidad', 'Detalle', 'Usuario'],
      this.filtrados.map((m) => [
        m.createdAt, this.detalleTipo(m.tipo), m.productoNombre, m.productoSku, m.cantidad,
        m.guiaRemision || m.nota || '', m.usuario || '',
      ])
    );
  }
}
