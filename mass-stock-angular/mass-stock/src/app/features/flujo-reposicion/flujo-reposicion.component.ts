import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { BusquedaService } from '../../core/busqueda.service';
import { PermisosService } from '../../core/permisos.service';
import { fechaRelativa, iniciales, tonoThumb, mensajeError } from '../../core/ui.util';
import { Producto } from '../../models/producto.model';
import { MovimientoHistorial } from '../../models/proveedor.model';
import { IconComponent } from '../../shared/icon/icon.component';

export type Etapa = 'detectado' | 'priorizado' | 'pendiente' | 'repuesto' | 'verificado';

interface FilaFlujo {
  producto: Producto;
  etapa: Etapa;
  ultimaReposicion: string | null;
}

const HORA = 60 * 60 * 1000;
const VENTANA_REPUESTO = 24 * HORA; // repuesto hace menos de 24 h
const VENTANA_VERIFICADO = 7 * 24 * HORA; // se mantiene sobre el mínimo hasta 7 días después

export const ETAPAS: { valor: Etapa; paso: number; titulo: string; sub: string; icono: string; tono: string; ayuda: string }[] = [
  { valor: 'detectado', paso: 1, titulo: 'Detectado', sub: 'Stock bajo', icono: 'alert', tono: 'red',
    ayuda: 'Bajó al mínimo o por debajo; todavía no es crítico.' },
  { valor: 'priorizado', paso: 2, titulo: 'Priorizado', sub: 'Alta prioridad', icono: 'list', tono: 'yellow',
    ayuda: 'Sin stock o con la mitad del mínimo o menos: reponer primero.' },
  { valor: 'pendiente', paso: 3, titulo: 'Reposición', sub: 'Pendiente', icono: 'box', tono: 'orange',
    ayuda: 'Se registró una reposición en las últimas 24 h, pero aún no alcanza el mínimo.' },
  { valor: 'repuesto', paso: 4, titulo: 'Repuesto', sub: 'Completado', icono: 'cart', tono: 'blue',
    ayuda: 'Repuesto en las últimas 24 h y ya está sobre el mínimo.' },
  { valor: 'verificado', paso: 5, titulo: 'Verificado', sub: 'Stock actualizado', icono: 'check', tono: 'green',
    ayuda: 'Repuesto hace más de 24 h y el stock se mantiene sobre el mínimo.' },
];

@Component({
  selector: 'app-flujo-reposicion',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './flujo-reposicion.component.html',
  styleUrl: './flujo-reposicion.component.css',
})
export class FlujoReposicionComponent implements OnInit, OnDestroy {
  @Output() irA = new EventEmitter<string>();

  filas: FilaFlujo[] = [];
  loading = true;
  errorMsg: string | null = null;
  filtro: Etapa | 'todos' = 'todos';
  verAyuda = false;
  sinHistorial = false;

  readonly etapas = ETAPAS;
  readonly iniciales = iniciales;
  readonly tonoThumb = tonoThumb;
  readonly fechaRelativa = fechaRelativa;

  constructor(private api: ApiService, private permisos: PermisosService, private busqueda: BusquedaService) {}

  ngOnInit(): void {
    this.cargar();
    this.api.conectarHub(() => this.cargar());
  }

  ngOnDestroy(): void {
    this.api.desconectarHub();
  }

  async cargar(): Promise<void> {
    try {
      // Si la API no deja leer el historial a este rol, el flujo se calcula solo con
      // el stock actual (etapas Detectado y Priorizado) en vez de fallar.
      const [productos, historial] = await Promise.all([
        this.api.listarProductos(),
        this.api.listarHistorial(500).catch((err) => {
          if (err?.status === 403) return null;
          throw err;
        }),
      ]);
      this.sinHistorial = historial === null;
      this.filas = this.clasificar(productos, historial ?? []);
      this.errorMsg = null;
    } catch (err) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  /** Ubica cada producto en una etapa del flujo según su stock y su última reposición. */
  private clasificar(productos: Producto[], historial: MovimientoHistorial[]): FilaFlujo[] {
    const ahora = Date.now();
    const filas: FilaFlujo[] = [];

    for (const p of productos) {
      const ultima = historial
        .filter((m) => m.productoSku === p.sku && m.tipo === 'reposicion')
        .reduce<string | null>((max, m) => (!max || m.createdAt > max ? m.createdAt : max), null);
      const hace = ultima ? ahora - +new Date(ultima) : Infinity;
      const bajo = p.stockActual <= p.stockMinimo;

      let etapa: Etapa | null = null;
      if (bajo) {
        if (hace <= VENTANA_REPUESTO) etapa = 'pendiente';
        else if (p.stockActual === 0 || p.stockActual <= p.stockMinimo / 2) etapa = 'priorizado';
        else etapa = 'detectado';
      } else if (hace <= VENTANA_REPUESTO) {
        etapa = 'repuesto';
      } else if (hace <= VENTANA_VERIFICADO) {
        etapa = 'verificado';
      }

      if (etapa) filas.push({ producto: p, etapa, ultimaReposicion: ultima });
    }

    const orden = ETAPAS.map((e) => e.valor);
    return filas.sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa) || a.producto.nombre.localeCompare(b.producto.nombre));
  }

  contar(etapa: Etapa): number {
    return this.filas.filter((f) => f.etapa === etapa).length;
  }

  get visibles(): FilaFlujo[] {
    return this.filtro === 'todos' ? this.filas : this.filas.filter((f) => f.etapa === this.filtro);
  }

  info(etapa: Etapa) {
    return ETAPAS.find((e) => e.valor === etapa)!;
  }

  etiquetaEstado(etapa: Etapa): string {
    return { detectado: 'Detectado', priorizado: 'Priorizado', pendiente: 'Reposición pendiente', repuesto: 'Completado', verificado: 'Verificado' }[etapa];
  }

  get puedeReponer(): boolean {
    return this.permisos.puedeEditar('reposicion');
  }

  get puedeVerHistorial(): boolean {
    return this.permisos.puedeVer('historial');
  }

  reponer(f: FilaFlujo): void {
    this.busqueda.productoParaReponer.set(f.producto.id);
    this.irA.emit('reposicion');
  }

  verHistorial(): void {
    this.irA.emit('historial');
  }
}
