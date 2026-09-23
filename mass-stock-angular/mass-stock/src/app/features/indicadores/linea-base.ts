// Línea base "ANTES" de implementar MassStock (proceso manual con cuaderno/
// conteo en percha). Estos valores NO están en la base de datos: salen del
// diagnóstico inicial del proyecto. Reemplázalos por los medidos en tienda.
export const LINEA_BASE = {
  /** Minutos promedio desde que un producto queda bajo el mínimo hasta que se repone. */
  tiempoReposicionMin: 25,
  /** Productos bajo el mínimo en un día típico. */
  productosConQuiebre: 8,
  /** Minutos promedio hasta que alguien se daba cuenta del stock bajo. */
  tiempoDeteccionMin: 18,
  /** Correcciones por errores de registro/conteo cada 30 días. */
  registrosConErrorMes: 6,
};
