import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/ui.util';
import { EpisodioQuiebre, PuntoStock, episodiosDeQuiebre, lineaDeTiempo, stockEn } from '../../core/stock-historia.util';
import { Producto } from '../../models/producto.model';
import { MovimientoHistorial } from '../../models/proveedor.model';
import { BarChartComponent, BarChartSerie } from '../../shared/bar-chart/bar-chart.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { WordmarkComponent } from '../../shared/wordmark/wordmark.component';
import { LINEA_BASE } from './linea-base';

const DIA = 24 * 60 * 60 * 1000;

interface Indicador {
  titulo: string;
  icono: string;
  tono: string;
  antes: string;
  despues: string;
  mejora: number | null; // % de reducción; null = sin datos suficientes
  nota?: string;
}

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule, BarChartComponent, IconComponent, WordmarkComponent],
  templateUrl: './indicadores.component.html',
  styleUrl: './indicadores.component.css',
})
export class IndicadoresComponent implements OnInit {
  loading = true;
  errorMsg: string | null = null;
  dias = 30;

  private productos: Producto[] = [];
  private movimientos: MovimientoHistorial[] = [];

  indicadores: Indicador[] = [];
  etiquetasDias: string[] = [];
  serieTiempo: BarChartSerie[] = [];
  serieQuiebre: BarChartSerie[] = [];
  mejoraTiempo: number | null = null;
  mejoraQuiebre: number | null = null;

  readonly base = LINEA_BASE;
  readonly rangos = [
    { label: '7 días', valor: 7 },
    { label: '30 días', valor: 30 },
    { label: '90 días', valor: 90 },
  ];

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    try {
      [this.productos, this.movimientos] = await Promise.all([this.api.listarProductos(), this.api.listarHistorial(500)]);
      this.calcular();
    } catch (err) {
      this.errorMsg = mensajeError(err);
    } finally {
      this.loading = false;
    }
  }

  cambiarRango(dias: number): void {
    this.dias = dias;
    this.calcular();
  }

  get rangoTexto(): string {
    const f = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${f(new Date(Date.now() - this.dias * DIA))} - ${f(new Date())}`;
  }

  private reduccion(antes: number, despues: number | null): number | null {
    if (despues === null || antes <= 0) return null;
    return Math.round(((antes - despues) / antes) * 100);
  }

  private calcular(): void {
    const ahora = Date.now();
    const desde = ahora - this.dias * DIA;
    const episodios = episodiosDeQuiebre(this.productos, this.movimientos);

    // 1. Tiempo promedio de reposición: episodios cerrados dentro del rango
    const cerrados = episodios.filter((e) => e.fin !== null && e.fin >= desde);
    const tiempoDespues = cerrados.length
      ? Math.round(cerrados.reduce((acc, e) => acc + (e.fin! - e.inicio), 0) / cerrados.length / 60000)
      : null;

    // 2. Productos con quiebre: promedio diario de productos al mínimo o por debajo
    const diasRango = Array.from({ length: this.dias }, (_, i) => this.finDelDia(ahora - (this.dias - 1 - i) * DIA));
    const quiebrePorDia = diasRango.map((fin) => this.productosBajoMinimo(fin));
    const quiebreDespues = quiebrePorDia.length
      ? Math.round((quiebrePorDia.reduce((a, b) => a + b, 0) / quiebrePorDia.length) * 10) / 10
      : null;

    // 3. Registros con error: ajustes por conteo cíclico dentro del rango
    const errores = this.movimientos.filter(
      (m) => m.tipo === 'ajuste' && (m.nota ?? '').toLowerCase().includes('conteo') && +new Date(m.createdAt) >= desde
    ).length;
    const erroresAntes = Math.round((LINEA_BASE.registrosConErrorMes * this.dias) / 30);

    this.mejoraTiempo = this.reduccion(LINEA_BASE.tiempoReposicionMin, tiempoDespues);
    this.mejoraQuiebre = this.reduccion(LINEA_BASE.productosConQuiebre, quiebreDespues);

    this.indicadores = [
      {
        titulo: 'Tiempo promedio de reposición', icono: 'clock', tono: 'blue',
        antes: `${LINEA_BASE.tiempoReposicionMin} min`,
        despues: tiempoDespues === null ? '—' : this.formatoMinutos(tiempoDespues),
        mejora: this.mejoraTiempo,
        nota: tiempoDespues === null ? 'Aún no hay quiebres repuestos en el rango' : `${cerrados.length} reposiciones medidas`,
      },
      {
        titulo: 'Productos con quiebre', icono: 'box', tono: 'green',
        antes: `${LINEA_BASE.productosConQuiebre}`,
        despues: quiebreDespues === null ? '—' : `${quiebreDespues}`,
        mejora: this.mejoraQuiebre,
        nota: 'promedio diario',
      },
      {
        titulo: 'Tiempo de detección de stock bajo', icono: 'alert', tono: 'red',
        antes: `${LINEA_BASE.tiempoDeteccionMin} min`,
        despues: 'Inmediato',
        mejora: 100,
        nota: 'alerta automática en tiempo real',
      },
      {
        titulo: 'Registros con error', icono: 'file', tono: 'purple',
        antes: `${erroresAntes}`,
        despues: `${errores}`,
        mejora: this.reduccion(erroresAntes, errores),
        nota: 'ajustes por conteo en el rango',
      },
    ];

    this.armarGraficos(episodios);
  }

  /** Gráficos de los últimos 7 días (siempre 7 barras, como en el tablero). */
  private armarGraficos(episodios: EpisodioQuiebre[]): void {
    const ahora = Date.now();
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ahora - (6 - i) * DIA);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    this.etiquetasDias = dias.map((d) => d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''));

    const tiempoPorDia = dias.map((d) => {
      const ini = +d;
      const fin = ini + DIA;
      const del = episodios.filter((e) => e.fin !== null && e.fin >= ini && e.fin < fin);
      return del.length ? Math.round(del.reduce((a, e) => a + (e.fin! - e.inicio), 0) / del.length / 60000) : 0;
    });

    this.serieTiempo = [
      { nombre: 'Antes (línea base)', color: 'var(--antes-azul)', valores: dias.map(() => LINEA_BASE.tiempoReposicionMin) },
      { nombre: 'Después', color: 'var(--brand-blue)', valores: tiempoPorDia },
    ];
    this.serieQuiebre = [
      { nombre: 'Antes (línea base)', color: 'var(--antes-rojo)', valores: dias.map(() => LINEA_BASE.productosConQuiebre) },
      { nombre: 'Después', color: 'var(--red)', valores: dias.map((d) => this.productosBajoMinimo(+d + DIA - 1)) },
    ];
  }

  private lineas: Map<string, PuntoStock[]> | null = null;

  private productosBajoMinimo(instante: number): number {
    if (!this.lineas) this.lineas = lineaDeTiempo(this.productos, this.movimientos);
    if (instante >= Date.now()) return this.productos.filter((p) => p.stockActual <= p.stockMinimo).length;
    return this.productos.filter((p) => stockEn(this.lineas!.get(p.sku) ?? [], p.stockActual, instante) <= p.stockMinimo).length;
  }

  private finDelDia(ms: number): number {
    const d = new Date(ms);
    d.setHours(23, 59, 59, 999);
    return +d;
  }

  private formatoMinutos(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h} h ${min % 60} min` : `${Math.round(h / 24)} d`;
  }
}
