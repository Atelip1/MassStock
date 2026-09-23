export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
}

// Auditoría / evidencia de uso (capítulo 7.6)
export interface MovimientoHistorial {
  id: string;
  productoNombre: string;
  productoSku: string;
  tipo: 'ingreso' | 'reposicion' | 'venta' | 'ajuste';
  cantidad: number;
  guiaRemision: string | null;
  nota: string | null;
  usuario: string | null;
  createdAt: string;
}
