import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PermisosService } from '../../core/permisos.service';
import { fechaLarga, fechaRelativa } from '../../core/ui.util';
import { ProductoAlerta } from '../../models/producto.model';
import { MovimientoHistorial } from '../../models/proveedor.model';
import { BarChartComponent, BarChartSerie } from '../../shared/bar-chart/bar-chart.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';
import { BrandBannerComponent } from '../../shared/brand-banner/brand-banner.component';

interface ItemActividad {
  titulo: string;
  detalle: string;
  cuando: string;
  tono: 'red' | 'green' | 'blue' | 'yellow';
  icono: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, BarChartComponent, IconComponent, WordmarkComponent, BrandBannerComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnInit {
  @Output() irA = new EventEmitter<string>();

  loading = true;

  totalProductos = 0;
  alertas: ProductoAlerta[] = [];
  movimientos: MovimientoHistorial[] = [];
  movimientosHoy = 0;
  usuariosActivos = 0;

  etiquetasChart: string[] = [];
  seriesChart: BarChartSerie[] = [];

  readonly fecha = fechaLarga();

  constructor(private api: ApiService, public auth: AuthService, public permisos: PermisosService) {}

  get rol() {
    return this.auth.usuario()?.rol;
  }

  get esAdmin() {
    return this.rol === 'administrador';
  }

  get esEncargado() {
    return this.rol === 'encargado';
  }

  get esReponedor() {
    return this.rol === 'reponedor';
  }

  get puedeVerTendencia() {
    return this.esAdmin || this.esEncargado;
  }

  get nombreCorto(): string {
    return this.auth.usuario()?.nombre?.split(' ')?.[0] ?? '';
  }

  get saludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get totalAlertas(): number {
    return this.alertas.length;
  }

  /** Alertas de quiebre primero, luego los últimos movimientos registrados. */
  get actividad(): ItemActividad[] {
    const deAlertas: ItemActividad[] = this.alertas.slice(0, 3).map((a) => ({
      titulo: a.nombre,
      detalle: a.stockActual === 0 ? 'Sin stock en tienda' : 'Stock por debajo del mínimo',
      cuando: `${a.stockActual}/${a.stockMinimo}`,
      tono: 'red',
      icono: 'alert',
    }));
    const deMovs: ItemActividad[] = this.movimientos.slice(0, 5).map((m) => ({
      titulo: this.tituloMovimiento(m.tipo),
      detalle: m.productoNombre,
      cuando: fechaRelativa(m.createdAt),
      tono: m.tipo === 'venta' || m.tipo === 'ajuste' ? 'blue' : 'green',
      icono: m.tipo === 'venta' || m.tipo === 'ajuste' ? 'arrow-up-right' : 'check',
    }));
    return [...deAlertas, ...deMovs].slice(0, 5);
  }

  private tituloMovimiento(tipo: string): string {
    if (tipo === 'ingreso') return 'Ingreso de stock';
    if (tipo === 'reposicion') return 'Reposición registrada';
    if (tipo === 'venta') return 'Venta registrada';
    return 'Ajuste de stock';
  }

  async ngOnInit(): Promise<void> {
    const tareas: Promise<any>[] = [
      this.api.listarProductos().then((p) => (this.totalProductos = p.length)),
      this.api.listarAlertas().then((a) => (this.alertas = a)),
    ];

    if (this.puedeVerTendencia) {
      tareas.push(
        this.api.listarHistorial(300).then((h) => {
          this.movimientos = h;
          const hoyStr = new Date().toDateString();
          this.movimientosHoy = h.filter((m) => new Date(m.createdAt).toDateString() === hoyStr).length;
          this.armarGrafico(h);
        })
      );
    }

    if (this.esAdmin) {
      tareas.push(this.api.listarUsuarios().then((u) => (this.usuariosActivos = u.filter((x) => x.activo).length)));
    }

    await Promise.allSettled(tareas);
    this.loading = false;
  }

  /** Unidades de ingresos y reposiciones de los últimos 7 días, agrupadas por día. */
  private armarGrafico(h: MovimientoHistorial[]): void {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const sumar = (tipo: string) =>
      dias.map((d) =>
        h
          .filter((m) => m.tipo === tipo && new Date(m.createdAt).toDateString() === d.toDateString())
          .reduce((acc, m) => acc + m.cantidad, 0)
      );

    this.etiquetasChart = dias.map((d) => d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''));
    this.seriesChart = [
      { nombre: 'Ingresos', color: 'var(--brand-blue)', valores: sumar('ingreso') },
      { nombre: 'Reposiciones', color: 'var(--brand-yellow)', valores: sumar('reposicion') },
    ];
  }
}
