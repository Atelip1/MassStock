import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PermisosService } from '../../core/permisos.service';
import { BusquedaService } from '../../core/busqueda.service';
import { descargarCsv } from '../../core/csv.util';
import { fechaLarga, horaCorta, iniciales, tonoThumb, mensajeError } from '../../core/ui.util';
import { ProductoAlerta } from '../../models/producto.model';
import { IconComponent } from '../../shared/icon/icon.component';

type Orden = 'urgencia' | 'faltante' | 'nombre';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css',
})
export class AlertasComponent implements OnInit, OnDestroy {
  @Output() irA = new EventEmitter<string>();

  alertas: ProductoAlerta[] = [];
  loading = true;
  errorMsg: string | null = null;

  texto = '';
  categoria = '';
  orden: Orden = 'urgencia';
  estado: '' | 'critico' | 'alerta' = '';

  readonly fecha = fechaLarga();
  readonly hora = horaCorta();
  readonly iniciales = iniciales;
  readonly tonoThumb = tonoThumb;

  constructor(private api: ApiService, private permisos: PermisosService, private busqueda: BusquedaService) {}

  ngOnInit(): void {
    this.cargar();
    // se refresca sola cuando cambia el stock en cualquier parte del sistema
    this.api.conectarHub(() => this.cargar());
  }

  ngOnDestroy(): void {
    this.api.desconectarHub();
  }

  async cargar(): Promise<void> {
    try {
      this.alertas = await this.api.listarAlertas();
      this.errorMsg = null;
    } catch (err) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  get puedeReponer(): boolean {
    return this.permisos.puedeEditar('reposicion');
  }

  /** Acción principal de la fila: reponer si el rol puede, si no revisar el stock. */
  generarReposicion(a?: ProductoAlerta): void {
    if (a && this.puedeReponer) this.busqueda.productoParaReponer.set(a.id);
    this.irA.emit(this.puedeReponer ? 'reposicion' : 'stock');
  }

  get categorias(): string[] {
    return [...new Set(this.alertas.map((a) => a.categoria).filter((c): c is string => !!c))].sort();
  }

  get criticos(): number {
    return this.alertas.filter((a) => this.severidad(a) === 'critico').length;
  }

  get totalFaltante(): number {
    return this.alertas.reduce((acc, a) => acc + a.faltante, 0);
  }

  get filtradas(): ProductoAlerta[] {
    const q = this.texto.trim().toLowerCase();
    const lista = this.alertas.filter((a) => {
      if (this.categoria && a.categoria !== this.categoria) return false;
      if (this.estado && this.severidad(a) !== this.estado) return false;
      if (q && !`${a.nombre} ${a.sku}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const orden = {
      urgencia: (a: ProductoAlerta, b: ProductoAlerta) => a.stockActual / (a.stockMinimo || 1) - b.stockActual / (b.stockMinimo || 1),
      faltante: (a: ProductoAlerta, b: ProductoAlerta) => b.faltante - a.faltante,
      nombre: (a: ProductoAlerta, b: ProductoAlerta) => a.nombre.localeCompare(b.nombre),
    }[this.orden];
    return [...lista].sort(orden);
  }

  severidad(a: ProductoAlerta): 'critico' | 'alerta' {
    // en quiebre total (0 unidades) vs. solo por debajo del mínimo
    return a.stockActual === 0 ? 'critico' : 'alerta';
  }

  barraAncho(a: ProductoAlerta): number {
    if (a.stockMinimo <= 0) return 100;
    return Math.min((a.stockActual / (a.stockMinimo * 2)) * 100, 100);
  }

  exportarCsv(): void {
    descargarCsv(
      'alertas-de-quiebre.csv',
      ['Producto', 'SKU', 'Categoría', 'Stock actual', 'Mínimo', 'Faltante'],
      this.filtradas.map((a) => [a.nombre, a.sku, a.categoria ?? '', a.stockActual, a.stockMinimo, a.faltante])
    );
  }
}
