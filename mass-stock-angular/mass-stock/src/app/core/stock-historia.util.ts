import { Producto } from '../models/producto.model';
import { MovimientoHistorial } from '../models/proveedor.model';

// Reconstruye cómo fue cambiando el stock de cada producto a partir de su
// stock actual y de los últimos movimientos (que son un bloque continuo, los
// más recientes). No hace falta guardar nada extra en la base de datos.

export interface PuntoStock {
  fecha: number; // ms desde epoch
  tipo: MovimientoHistorial['tipo'];
  antes: number;
  despues: number;
}

/** Episodio en que el producto cayó al mínimo o por debajo, y cuándo se recuperó. */
export interface EpisodioQuiebre {
  sku: string;
  inicio: number;
  fin: number | null; // null = sigue bajo el mínimo
}

export function delta(m: MovimientoHistorial): number {
  return m.tipo === 'ingreso' || m.tipo === 'reposicion' ? m.cantidad : -m.cantidad;
}

/** Línea de tiempo por SKU, en orden cronológico. */
export function lineaDeTiempo(productos: Producto[], movimientos: MovimientoHistorial[]): Map<string, PuntoStock[]> {
  const porSku = new Map<string, PuntoStock[]>();
  const desc = [...movimientos].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  for (const p of productos) {
    let actual = p.stockActual;
    const puntos: PuntoStock[] = [];
    for (const m of desc) {
      if (m.productoSku !== p.sku) continue;
      const antes = actual - delta(m);
      puntos.push({ fecha: +new Date(m.createdAt), tipo: m.tipo, antes, despues: actual });
      actual = antes;
    }
    porSku.set(p.sku, puntos.reverse());
  }
  return porSku;
}

export function episodiosDeQuiebre(productos: Producto[], movimientos: MovimientoHistorial[]): EpisodioQuiebre[] {
  const lineas = lineaDeTiempo(productos, movimientos);
  const episodios: EpisodioQuiebre[] = [];

  for (const p of productos) {
    let abierto: EpisodioQuiebre | null = null;
    for (const punto of lineas.get(p.sku) ?? []) {
      const cae = punto.antes > p.stockMinimo && punto.despues <= p.stockMinimo;
      const sube = punto.antes <= p.stockMinimo && punto.despues > p.stockMinimo;
      if (cae && !abierto) {
        abierto = { sku: p.sku, inicio: punto.fecha, fin: null };
        episodios.push(abierto);
      } else if (sube && abierto) {
        abierto.fin = punto.fecha;
        abierto = null;
      }
    }
  }
  return episodios;
}

/** Stock de un producto al final de un instante dado, según su línea de tiempo. */
export function stockEn(puntos: PuntoStock[], stockActual: number, instante: number): number {
  // el último movimiento anterior o igual al instante manda; si no hay, el stock era el "antes" del primero
  let valor = puntos.length ? puntos[0].antes : stockActual;
  for (const p of puntos) {
    if (p.fecha <= instante) valor = p.despues;
    else break;
  }
  return valor;
}
