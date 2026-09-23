// HU04: actividad de movimientos por producto en un rango de días.
export interface RotacionProducto {
  productoId: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  totalIngresado: number;
  totalRepuesto: number;
  totalSalida: number;
  movimientos: number;
}

// Actividad total por día, para sparklines y el gráfico de tendencia.
export interface TendenciaDia {
  fecha: string;
  totalUnidades: number;
}
