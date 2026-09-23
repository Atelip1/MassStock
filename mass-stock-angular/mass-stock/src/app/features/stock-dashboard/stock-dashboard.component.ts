import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PermisosService } from '../../core/permisos.service';
import { BusquedaService } from '../../core/busqueda.service';
import { descargarCsv } from '../../core/csv.util';
import { fechaRelativa, iniciales, tonoThumb, mensajeError } from '../../core/ui.util';
import { Producto } from '../../models/producto.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrandBannerComponent } from '../../shared/brand-banner/brand-banner.component';

const POR_PAGINA = 10;

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, BrandBannerComponent],
  templateUrl: './stock-dashboard.component.html',
  styleUrl: './stock-dashboard.component.css',
})
export class StockDashboardComponent implements OnInit, OnDestroy {
  @Output() irA = new EventEmitter<string>();

  productos: Producto[] = [];
  loading = true;
  refrescando = false;
  live = false;
  errorMsg: string | null = null;
  ultimaActualizacion: Date | null = null;

  categoria = '';
  estado: '' | 'ok' | 'bajo' = '';
  pagina = 1;

  readonly iniciales = iniciales;
  readonly tonoThumb = tonoThumb;

  constructor(private api: ApiService, private permisos: PermisosService, public busqueda: BusquedaService) {}

  ngOnInit(): void {
    this.cargar();
    this.api.conectarHub(() => this.cargar());
    // el hub tarda un instante en negociar la conexión
    setTimeout(() => (this.live = this.api.hubConectado), 800);
  }

  ngOnDestroy(): void {
    this.api.desconectarHub();
  }

  async cargar(): Promise<void> {
    try {
      this.productos = await this.api.listarProductos();
      this.ultimaActualizacion = new Date();
      this.errorMsg = null;
    } catch (err) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  async actualizar(): Promise<void> {
    this.refrescando = true;
    await this.cargar();
    this.live = this.api.hubConectado;
    this.refrescando = false;
  }

  get puedeReponer(): boolean {
    return this.permisos.puedeEditar('reposicion');
  }

  get categorias(): string[] {
    return [...new Set(this.productos.map((p) => p.categoria).filter((c): c is string => !!c))].sort();
  }

  get filtrados(): Producto[] {
    const q = this.busqueda.texto().trim().toLowerCase();
    return this.productos.filter((p) => {
      if (this.categoria && p.categoria !== this.categoria) return false;
      if (this.estado === 'bajo' && !this.estaBajo(p)) return false;
      if (this.estado === 'ok' && this.estaBajo(p)) return false;
      if (q && !`${p.nombre} ${p.sku} ${p.categoria ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  get paginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / POR_PAGINA));
  }

  get visibles(): Producto[] {
    const pag = Math.min(this.pagina, this.paginas);
    return this.filtrados.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);
  }

  get listaPaginas(): number[] {
    return Array.from({ length: this.paginas }, (_, i) => i + 1);
  }

  irPagina(p: number): void {
    this.pagina = Math.min(Math.max(1, p), this.paginas);
  }

  get bajoMinimo(): number {
    return this.productos.filter((p) => this.estaBajo(p)).length;
  }

  get enBuenEstado(): number {
    return this.productos.length - this.bajoMinimo;
  }

  get sinStock(): number {
    return this.productos.filter((p) => p.stockActual === 0).length;
  }

  porcentaje(n: number): number {
    return this.productos.length ? Math.round((n / this.productos.length) * 100) : 0;
  }

  get textoActualizacion(): string {
    if (!this.ultimaActualizacion) return '';
    return fechaRelativa(this.ultimaActualizacion.toISOString());
  }

  barraAncho(p: Producto): number {
    if (p.stockMinimo <= 0) return 100;
    return Math.min((p.stockActual / (p.stockMinimo * 2)) * 100, 100);
  }

  estaBajo(p: Producto): boolean {
    return p.stockActual <= p.stockMinimo;
  }

  exportarCsv(): void {
    descargarCsv(
      'stock-en-tiempo-real.csv',
      ['Producto', 'SKU', 'Categoría', 'Stock', 'Mínimo', 'Estado'],
      this.filtrados.map((p) => [p.nombre, p.sku, p.categoria ?? '', p.stockActual, p.stockMinimo, this.estaBajo(p) ? 'Reponer' : 'OK'])
    );
  }
}
