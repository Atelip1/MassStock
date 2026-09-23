// Los nombres coinciden con la serialización camelCase por defecto
// de ASP.NET Core (System.Text.Json) para los DTOs de MassStock.Api.
export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  stockActual: number;
  stockMinimo: number;
}

export interface ProductoOpcion {
  id: string;
  sku: string;
  nombre: string;
}

// HU03: producto en quiebre o por debajo del mínimo
export interface ProductoAlerta {
  id: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  stockActual: number;
  stockMinimo: number;
  faltante: number;
}
